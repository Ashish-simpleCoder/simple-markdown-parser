//#region src/parseList.tsx
const ROOT_ID = -1;
function parseList(inputs, parseListItemContent) {
	let listMap = new Map();
	listMap.set(ROOT_ID, {
		parent: null,
		children: []
	});
	let lastInsertedItem = null;
	inputs.forEach((line, id) => {
		id = id + 1;
		let listTypeToGenerate;
		if (MarkdownParser.execFn.ol(line)) {
			listTypeToGenerate = "ol";
		} else if (MarkdownParser.execFn.ul(line)) {
			listTypeToGenerate = "ul";
		}
		if (!listTypeToGenerate) return;
		let listItemExec = MarkdownParser.execFn[listTypeToGenerate](line);
		if (!listItemExec) return;
		const [match, currentListItemToBeInserted_Whitespace_Group, currentListItemToBeInserted_CheckBox_Group, currentListItemToBeInserted_Content_Group] = listItemExec;
		const parsedItemContent = parseListItemContent(currentListItemToBeInserted_Content_Group);
		const html_li_Element = document.createElement("li");
		if (!currentListItemToBeInserted_CheckBox_Group) {
			html_li_Element.innerHTML = parsedItemContent;
		} else {
			let input = `<input type='checkbox' />`;
			if (currentListItemToBeInserted_CheckBox_Group == "[x]") {
				input = `<input type='checkbox' checked />`;
			}
			html_li_Element.innerHTML = `
                ${input}
                ${parsedItemContent}
            `;
		}
		let newItemToInsert = null;
		if (!currentListItemToBeInserted_Whitespace_Group || !lastInsertedItem) {
			newItemToInsert = {
				id,
				parent: ROOT_ID,
				parentElementType: listTypeToGenerate,
				elementType: "li",
				text: html_li_Element.textContent,
				element: html_li_Element,
				item_whiteSpaceLength: 0,
				children: []
			};
		} else {
			if (!lastInsertedItem) return;
			if (lastInsertedItem.item_whiteSpaceLength == currentListItemToBeInserted_Whitespace_Group.length) {
				newItemToInsert = {
					id,
					parent: lastInsertedItem.parent,
					parentElementType: listTypeToGenerate,
					elementType: "li",
					text: html_li_Element.textContent,
					element: html_li_Element,
					item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
					children: []
				};
			} else if (currentListItemToBeInserted_Whitespace_Group.length < lastInsertedItem.item_whiteSpaceLength) {
				const parent = findParent_BasedOn_WhitespaceLength_Of_CurrentItem_ToBeInserted({
					htmlMap: listMap,
					lastInsertedItem,
					currentListItemToBeInserted_Whitespace_Length: currentListItemToBeInserted_Whitespace_Group.length
				});
				newItemToInsert = {
					id,
					parent: parent.id,
					parentElementType: listTypeToGenerate,
					elementType: "li",
					text: html_li_Element.textContent,
					element: html_li_Element,
					item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
					children: []
				};
			} else if (currentListItemToBeInserted_Whitespace_Group.length >= lastInsertedItem.item_whiteSpaceLength + 2) {
				newItemToInsert = {
					id,
					parent: lastInsertedItem.id,
					parentElementType: listTypeToGenerate,
					elementType: "li",
					text: html_li_Element.textContent,
					element: html_li_Element,
					item_whiteSpaceLength: currentListItemToBeInserted_Whitespace_Group.length,
					children: []
				};
			} else {}
		}
		if (newItemToInsert) {
			listMap.get(newItemToInsert.parent)?.children.push(id);
			listMap.set(newItemToInsert?.id, newItemToInsert);
			lastInsertedItem = newItemToInsert;
		}
	});
	if (listMap.size > 0) {
		const fragment = generateFullHtmlTree(listMap, listMap.get(ROOT_ID));
		if (fragment) {
			const element = document.createElement("div");
			element.appendChild(fragment);
			return element;
		}
	}
	return null;
}
function generateFullHtmlTree(map, rootElementObj) {
	let childIds = [...rootElementObj.children];
	let lastParentTagGenerated = null;
	const rootFragement = new DocumentFragment();
	let lastParentId = ROOT_ID;
	while (childIds.length > 0) {
		let didCreateNewParent = false;
		let currentChild = map.get(childIds.shift());
		if (!currentChild) continue;
		const parentElement = map.get(currentChild.parent);
		if (!parentElement) return;
		if (!lastParentTagGenerated) {
			lastParentTagGenerated = document.createElement(currentChild.parentElementType);
			rootFragement.appendChild(lastParentTagGenerated);
			didCreateNewParent = true;
			lastParentId = currentChild.parent;
		} else if (lastParentId != currentChild.parent || lastParentTagGenerated.nodeName.toLocaleLowerCase() != currentChild.parentElementType) {
			lastParentTagGenerated = document.createElement(currentChild.parentElementType);
			didCreateNewParent = true;
			lastParentId = currentChild.parent;
		}
		if (!lastParentTagGenerated) {
			console.log("not ava");
			return;
		}
		lastParentTagGenerated.appendChild(currentChild.element);
		if (didCreateNewParent) {
			if (currentChild.item_whiteSpaceLength == 0) {
				rootFragement.appendChild(lastParentTagGenerated);
			} else {
				parentElement?.element?.appendChild?.(lastParentTagGenerated);
			}
		}
		if (currentChild.children.length > 0) {
			childIds.push(...currentChild.children);
		}
	}
	return rootFragement;
}
function findParent_BasedOn_WhitespaceLength_Of_CurrentItem_ToBeInserted({ htmlMap, lastInsertedItem, currentListItemToBeInserted_Whitespace_Length: currentListItem_Whitespace_Length }) {
	let parent = lastInsertedItem;
	while (parent) {
		if (parent.item_whiteSpaceLength < currentListItem_Whitespace_Length) {
			break;
		}
		if (parent.parent) {
			parent = htmlMap.get(parent.parent);
		}
	}
	if (!parent) {
		return htmlMap.get(ROOT_ID);
	}
	return parent;
}

//#endregion