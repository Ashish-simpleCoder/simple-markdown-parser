import { ListParser } from './ListParser'


export type RawMakrdownString = string
export type MarkdownStringToken = string
export type ListItemMarkdownToken = string
export type ParsedMarkdownHtml = string

export const PARSER_TOKENS = {
    codeBlockPlaceholder: '###CODEBLOCK###'
}

export class BaseMarkdownParser {
    constructor() { }

    static rules = {
        blockItem: {
            h1: /^# (.+)$/gm,
            h2: /^## (.+)$/gm,
            h3: /^### (.+)$/gm,

            unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
            orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,

            blockquote: /^> (.+)$/g,
            hr: /^[\s]*[-*_]{3,}[\s]*$/g,
        },
        inlineItem: {
            // inline-element and they can be present anywhere, even inside any other elements, so regex is according to that-------------
            bold: /\*\*(.+?)\*\*/g,
            italic: /\*(.+?)\*/g,
            link: /\[(.+?)\]\((.+?)\)/g,
            code: /`(.+?)`/g,
            codeBlock: /```([\s\S]*?)```/g,
            image: /!\[(.+?)\]\((.+?)\)({width=\d+ height=\d+})?/g,
        }
    }

    static execFn = {
        codeBlock: (line: MarkdownStringToken) => /^\`{3}([\s\S]*?)\`{3}$/g.exec(line),
        ul: (line: MarkdownStringToken) => /^([ ]{0,})?[\-\*\+][ ](\[[ \\x]\])?(.+)$/m.exec(line), // Putting "m" flag, because line might have "\s" characters at beginning.
        ol: (line: MarkdownStringToken) => /^([ ]{0,})?\d+.[ ](\[[ \\x]\])?(.+)$/m.exec(line), // Putting "m" flag, because line might have "\s" characters at beginning.
        heading: (line: MarkdownStringToken) => /^(#{1,3}) (.+)$/g.exec(line),
        blockquote: (line: MarkdownStringToken) => /^> (.+)$/g.exec(line),
        hr: (line: MarkdownStringToken) => /^[\s]*[-*_]{3,}[\s]*$/g.exec(line),
        img: (line: MarkdownStringToken) => /^!\[(.+?)\]\((.+?)\)/g.exec(line),
        htmlTag: (line: MarkdownStringToken) => /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(line),

        newLine: (line: MarkdownStringToken) => /^\s*$/g.exec(line),
    }


    static preParserActions = {
        replaceAllCodeBlocksWithPlaceholder(markdown: RawMakrdownString): {
            replacedString: MarkdownStringToken,
            codeBlockList: MarkdownStringToken[]
        } {
            const codeBlockList: MarkdownStringToken[] = [];

            let replacedString = markdown.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
                codeBlockList.push(match)

                return `${PARSER_TOKENS.codeBlockPlaceholder}${codeBlockList.length - 1}${PARSER_TOKENS.codeBlockPlaceholder}`
            })
            return { replacedString, codeBlockList }
        },

        splitWholeMarkdownStringByBlockElement(markdown: RawMakrdownString): MarkdownStringToken[] {
            // split line-by in following sequence with below regx
            // 1. heading
            // 2. blockquote
            // 3. hr
            // 4. ul
            // 5. ol
            // 6. line-terminator (needed to split content present with codeblock to make them paragraphs)
            // 7. codeblock-placeholder
            let splittedHtml = markdown.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm)

            return splittedHtml
        },

        filterOutBlocksOnlyContainingWhiteSpaces: (markdownTokens: MarkdownStringToken[]): MarkdownStringToken[] => {
            const filteredResult = markdownTokens.filter(section => {
                // remove all of the blocks containing only white-space characters
                return !this.execFn.newLine(section)
            })
            return filteredResult
        },

        restoreCodeBlocksFromPlaceholders: (markdownTokens: MarkdownStringToken[], codeBlockList: MarkdownStringToken[]): MarkdownStringToken[] => {
            const mappedResult = markdownTokens.map(section => {
                return section.replace(new RegExp(`${PARSER_TOKENS.codeBlockPlaceholder}(\\d+)${PARSER_TOKENS.codeBlockPlaceholder}`, 'g'),
                    (match, index) => `${codeBlockList[index]}`
                )
            })
            return mappedResult
        },
    }

    static parsers = {
        /* 
            phases of Parsing
            
            1. preParseRawMarkdownString
            2. parseRawMarkdownStringAndConvertToHtml
        */


        /* 
            1. preParseRawString
            Only doing splitting, replacing codeblocks with placeholder values and filtering blocks only contaiting white-spaces from MarkdownStringToken line.
            This phase will only give MarkdownStringToken[] as output. No html injection.
        */
        preParseRawMarkdownString: (markdown: RawMakrdownString) => {
            let result = this.preParserActions.replaceAllCodeBlocksWithPlaceholder(markdown)
            let splittedRawStringList = this.preParserActions.splitWholeMarkdownStringByBlockElement(result.replacedString)
            let filteredRawStringList = this.preParserActions.filterOutBlocksOnlyContainingWhiteSpaces(splittedRawStringList)
            let rawStringList = this.preParserActions.restoreCodeBlocksFromPlaceholders(filteredRawStringList, result.codeBlockList)

            return rawStringList as MarkdownStringToken[]
        },


        /*
            2. parseRawMarkdownStringAndConvertToHtml
        */
        parseRawMarkdownStringAndConvertToHtml: (markdownTokens: MarkdownStringToken[]): ParsedMarkdownHtml => {
            const parsedMarkdownHtml: ParsedMarkdownHtml[] = []
            let markdownListItemArray: ListItemMarkdownToken[] = []
            let initialListDataLine:number = -1


            for (let itemIndex = 0; itemIndex < markdownTokens.length; itemIndex++) {
                /*
                    Parsing in below order
                    1. codeblock
                    2. List(ol/ul)
                    3. heading
                    4. blockquote
                    5. hr(horizontal rule)
                    6. Paragraph
                        - image
                        - inline codeblock
                        - code
                        - bold
                        - italic
                        - link
                        - and all text
                */
                const currentRawString = markdownTokens[itemIndex]


                // 1. Codeblock Parsing 
                const codeBlockExecResult = this.execFn.codeBlock(currentRawString)
                if (codeBlockExecResult) {

                    // parse current running list and close it off
                    if (markdownListItemArray.length > 0) {
                        const listHtml = ListParser.parse(markdownListItemArray, initialListDataLine)
                        if (listHtml) {
                            parsedMarkdownHtml.push(listHtml)
                        }
                        markdownListItemArray = []
                        initialListDataLine = -1
                    }

                    const [wholeCodeBlock, codeBlockContent] = codeBlockExecResult
                    parsedMarkdownHtml.push(`<pre data-line='${itemIndex}'><code>${codeBlockContent}</code></pre>`)

                    continue
                }

                // 2. List Parsing(ol/ul)
                if (this.execFn.ol(currentRawString) || this.execFn.ul(currentRawString)) {
                    markdownListItemArray.push(currentRawString)
                    if(initialListDataLine == -1){
                        initialListDataLine = itemIndex
                    }
                    continue
                }

                // parse current running list and close it off
                if (markdownListItemArray.length > 0) {
                    const listHtml = ListParser.parse(markdownListItemArray,initialListDataLine)
                    if (listHtml) {
                        parsedMarkdownHtml.push(listHtml)
                    }
                    markdownListItemArray = []
                    initialListDataLine = -1
                }

                // 3. Heading Parsing
                const headingExecResult = this.execFn.heading(currentRawString)
                if (headingExecResult) {
                    const [wholeHeading, headingVariant, headingContent] = headingExecResult
                    let parsedHeadingContent = this.parsers.parseInlineMarkdownStringToken(headingContent)

                    if (headingVariant == '#') {
                        parsedMarkdownHtml.push(`<h1 data-line='${itemIndex}'>${parsedHeadingContent}</h1>`)
                    } else if (headingVariant == "##") {
                        parsedMarkdownHtml.push(`<h2 data-line='${itemIndex}'>${parsedHeadingContent}</h2>`)
                    } else if (headingVariant == "###") {
                        parsedMarkdownHtml.push(`<h3 data-line='${itemIndex}'>${parsedHeadingContent}</h3>`)
                    }
                    continue
                }

                // 4. Blockquote Parsing
                const blockquoteExecResult = this.execFn.blockquote(currentRawString)
                if (blockquoteExecResult) {
                    const [wholeBlockquote, blockquoteContent] = blockquoteExecResult
                    parsedMarkdownHtml.push(`<blockquote data-line='${itemIndex}'>${blockquoteContent}</blockquote>`)
                    continue
                }

                // 5. Horizontal Rule(hr) Parsing
                const hrExec = this.execFn.hr(currentRawString)
                if (hrExec) {
                    parsedMarkdownHtml.push(`<hr data-line='${itemIndex}'/>`)
                    continue
                }

                // 6. Paragraph parsing
                const splittedLines = currentRawString.split("\n\n")   // To count multiple lines with \n as single paragraph. Which allows to write one paragraph in multiple lines.
                for (const content of splittedLines) {
                    if (content.trim()) {
                        // If content is valid html tag then insert as it is.
                        const tagExec = this.execFn.htmlTag(content)
                        if (tagExec) {
                            const [wholeHtmlTag] = tagExec
                            parsedMarkdownHtml.push(wholeHtmlTag)
                        } else {
                            const paragraph = this.parsers.parseInlineMarkdownStringToken(content)
                            parsedMarkdownHtml.push(`<p data-line='${itemIndex}'>${paragraph}</p>`)
                        }
                    }
                }

            }

            // Parse any running list and close it off
            if (markdownListItemArray.length > 0) {
                const listHtml = ListParser.parse(markdownListItemArray,initialListDataLine)
                if (listHtml) {
                    parsedMarkdownHtml.push(listHtml)
                }
                markdownListItemArray = []
                initialListDataLine = -1
            }


            return parsedMarkdownHtml.join("\n")
        },


        parseInlineMarkdownStringToken: (markdownToken: MarkdownStringToken): ParsedMarkdownHtml => {
            let parsedItemWithRegx = markdownToken

            if (this.rules.inlineItem.image.test(markdownToken)) {
                parsedItemWithRegx = markdownToken.replace(this.rules.inlineItem.image, `<img src='$2' alt='$1' $3 />`)
            }
            if (this.rules.inlineItem.codeBlock.test(parsedItemWithRegx)) {
                parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.codeBlock, '<code>$1</code>')
            }
            if (this.rules.inlineItem.code.test(parsedItemWithRegx)) {
                parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.code, '<code>$1</code>')
            }
            if (this.rules.inlineItem.bold.test(parsedItemWithRegx)) {
                parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.bold, '<strong>$1</strong>')
            }
            if (this.rules.inlineItem.italic.test(parsedItemWithRegx)) {
                parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.italic, '<em>$1</em>')
            }
            if (this.rules.inlineItem.link.test(parsedItemWithRegx)) {
                parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.link, '<a href="$2">$1</a>')
            }

            return parsedItemWithRegx
        }

    }
}