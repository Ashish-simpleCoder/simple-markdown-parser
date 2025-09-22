import { BaseMarkdownParser, ListItemMarkdownToken } from '../BaseMarkdownParser'

type ListItemParentElementType = "ol" | "ul"
type ListItem = {
    id: number
    parentId: number
    parentElementType: ListItemParentElementType
    elementType: "li"
    text: string | null
    element: HTMLElement
    item_whiteSpaceLength: number
    children: number[]
} | null
type ParentOfListItem = ListItem
type HtmlMap = Map<number, ListItem>

const ROOT_ID = -1

export class ListParser {
    constructor() { }

    static actions = {
        findParent_OfListItemObj_ToBeInserted_Based_On_Whitespace_Length: ({ listItemTree, lastInsertedListItemObj, listItemToBeInserted_Whitespace_Length }: {
            listItemTree: HtmlMap,
            lastInsertedListItemObj: ListItem,
            listItemToBeInserted_Whitespace_Length: number
        }): ParentOfListItem => {
            let parentObj: ListItem | undefined = lastInsertedListItemObj

            while (parentObj) {
                if (parentObj.item_whiteSpaceLength < listItemToBeInserted_Whitespace_Length) {
                    break
                }
                if (parentObj.parentId) {
                    parentObj = listItemTree.get(parentObj.parentId)
                }
            }

            // If no parent, then ROOT will be the parent
            if (!parentObj) {
                return listItemTree.get(ROOT_ID)!
            }
            return parentObj!
        },
        generateHTMLTree: (listItemTree: HtmlMap) => {
            let childIds = [...listItemTree.get(ROOT_ID)!.children]

            const rootFragement = new DocumentFragment()
            let lastParentTagGenerated: HTMLElement | null = null
            let parentIdOfPreviousalyInsertedListItem = ROOT_ID

            while (childIds.length > 0) {
                let didCreateNewParentElement = false
                let currentListItemChild = listItemTree.get(childIds.shift() as any)

                if (!currentListItemChild) {
                    continue
                }

                const parentElementObj = listItemTree.get(currentListItemChild.parentId)

                // 
                if (!parentElementObj) {
                    continue
                }

                // Initial Parent generation of list item
                if (!lastParentTagGenerated) {
                    lastParentTagGenerated = document.createElement(currentListItemChild.parentElementType)
                    rootFragement.appendChild(lastParentTagGenerated)

                    didCreateNewParentElement = true
                    parentIdOfPreviousalyInsertedListItem = currentListItemChild.parentId
                }
                // if parentId or parentElement type changes
                // prettier-ignore
                else if (parentIdOfPreviousalyInsertedListItem != currentListItemChild.parentId || lastParentTagGenerated.nodeName.toLocaleLowerCase() != currentListItemChild.parentElementType) {
                    lastParentTagGenerated = document.createElement(currentListItemChild.parentElementType)

                    didCreateNewParentElement = true
                    parentIdOfPreviousalyInsertedListItem = currentListItemChild.parentId
                }

                if (!lastParentTagGenerated) {
                    return
                }

                // Appending current listItem to it's parent
                lastParentTagGenerated.appendChild(currentListItemChild.element)
                if (!lastParentTagGenerated.getAttribute('data-line')) {
                    //@ts-expect-error No need to check for null value.
                    lastParentTagGenerated.setAttribute('data-line', currentListItemChild.element.getAttribute('data-line'))
                }

                // Appending newly generated parent element to currentListItem's original parent container
                if (didCreateNewParentElement) {
                    if (currentListItemChild.item_whiteSpaceLength == 0) {
                        rootFragement.appendChild(lastParentTagGenerated)
                    } else {
                        parentElementObj.element.appendChild(lastParentTagGenerated)
                    }
                }

                // Pushing current listItem's children ids to array for iteration
                if (currentListItemChild.children.length > 0) {
                    childIds.push(...currentListItemChild.children)
                }
            }

            return rootFragement
        }
    }

    static parse(listItemMarkdownTokens: ListItemMarkdownToken[], initialElementDataLine: number) {

        if (!listItemMarkdownTokens || listItemMarkdownTokens.length == 0) {
            return null
        }

        const listItemTree = new Map() as HtmlMap
        // @ts-expect-error Bypassing the type only for root
        listItemTree.set(ROOT_ID, { parentId: null, children: [] })

        let lastInsertedListItemObj: ListItem | undefined
        let currentListItemId = 1

        while (listItemMarkdownTokens.length > 0) {
            let currentListItemToken = listItemMarkdownTokens.shift()
            let currentListItemParentElementType: ListItemParentElementType | null = null
            let newListItemToInsertObj: ListItem = null


            if (!currentListItemToken) {
                continue
            }


            if (BaseMarkdownParser.execFn.ol(currentListItemToken)) {
                currentListItemParentElementType = "ol"
            }
            if (BaseMarkdownParser.execFn.ul(currentListItemToken)) {
                currentListItemParentElementType = "ul"
            }

            if (!currentListItemParentElementType) {
                continue
            }

            const currentListItemExec = BaseMarkdownParser.execFn[currentListItemParentElementType](currentListItemToken)
            if (!currentListItemExec) {
                continue
            }

            const [match, currentListItemToBeInserted_Whitespace_Group, currentListItemToBeInserted_CheckBox_Group, currentListItemToBeInserted_Content_Group] = currentListItemExec
            const parsedListItemHtmlContent = BaseMarkdownParser.parsers.parseInlineMarkdownStringToken(currentListItemToBeInserted_Content_Group)
            const htmlLiElement = document.createElement("li")

            // @ts-expect-error Not needed to parse number as string. Implicity coercion will be done
            htmlLiElement.setAttribute('data-line', initialElementDataLine)

            if (!currentListItemToBeInserted_CheckBox_Group) {
                htmlLiElement.innerHTML = parsedListItemHtmlContent
            } else {
                let input = `<input type='checkbox' />`
                if (currentListItemToBeInserted_CheckBox_Group == "[x]") {
                    input = `<input type='checkbox' checked />`
                }
                htmlLiElement.innerHTML = `
                    ${input}
                    ${parsedListItemHtmlContent}
                `
            }

            // If no whitespace, then insert it as root child
            if (!currentListItemToBeInserted_Whitespace_Group || !lastInsertedListItemObj) {
                newListItemToInsertObj = {
                    id: currentListItemId,
                    parentId: ROOT_ID,
                    parentElementType: currentListItemParentElementType,
                    elementType: "li",
                    text: htmlLiElement.textContent,
                    element: htmlLiElement,
                    item_whiteSpaceLength: 0,
                    children: [],
                }
            } else {
                if (lastInsertedListItemObj.item_whiteSpaceLength == currentListItemToBeInserted_Whitespace_Group.length) {
                    newListItemToInsertObj = {
                        id: currentListItemId,
                        parentId: lastInsertedListItemObj.parentId,
                        parentElementType: currentListItemParentElementType,
                        elementType: "li",
                        text: htmlLiElement.textContent,
                        element: htmlLiElement,
                        item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
                        children: [],
                    }
                }
                /*
                    If currentItem nesting level is less than previous inserted item,
                    then find the correct parent of currentItem from the listMap
                */
                else if (currentListItemToBeInserted_Whitespace_Group.length < lastInsertedListItemObj.item_whiteSpaceLength) {
                    const currentListItemParentObj = this.actions.findParent_OfListItemObj_ToBeInserted_Based_On_Whitespace_Length({
                        listItemTree,
                        lastInsertedListItemObj: lastInsertedListItemObj,
                        listItemToBeInserted_Whitespace_Length: currentListItemToBeInserted_Whitespace_Group.length
                    })!

                    newListItemToInsertObj = {
                        id: currentListItemId,
                        parentId: currentListItemParentObj.id,
                        parentElementType: currentListItemParentElementType,
                        elementType: "li",
                        text: htmlLiElement.textContent,
                        element: htmlLiElement,
                        item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
                        children: [],
                    }
                } else if (currentListItemToBeInserted_Whitespace_Group.length >= lastInsertedListItemObj.item_whiteSpaceLength + 2) {
                    newListItemToInsertObj = {
                        id: currentListItemId,
                        parentId: lastInsertedListItemObj.id,
                        parentElementType: currentListItemParentElementType,
                        elementType: "li",
                        text: htmlLiElement.textContent,
                        element: htmlLiElement,
                        item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
                        children: [],
                    }
                }
            }
            if (newListItemToInsertObj) {
                listItemTree.get(newListItemToInsertObj.parentId)?.children.push(currentListItemId)
                listItemTree.set(newListItemToInsertObj?.id, newListItemToInsertObj)
                lastInsertedListItemObj = newListItemToInsertObj
            }

            // Increment counter for id
            currentListItemId++
            initialElementDataLine++
        }

        if (listItemTree.size == 0) {
            return null
        }
        const rootFragementOfList = this.actions.generateHTMLTree(listItemTree)
        if (rootFragementOfList) {
            const element = document.createElement("div")
            element.appendChild(rootFragementOfList)
            return element.innerHTML
        }
    }
}