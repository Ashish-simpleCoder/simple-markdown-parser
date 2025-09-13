//#region src/MarkdownParser.tsx
var MarkdownParser = class MarkdownParser {
	rules = {
		blockItem: {
			h1: /^# (.+)$/gm,
			h2: /^## (.+)$/gm,
			h3: /^### (.+)$/gm,
			unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
			orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,
			blockquote: /^> (.+)$/g,
			hr: /^[\s]*[-*_]{3,}[\s]*$/g
		},
		inlineItem: {
			bold: /\*\*(.+?)\*\*/g,
			italic: /\*(.+?)\*/g,
			link: /\[(.+?)\]\((.+?)\)/g,
			code: /`(.+?)`/g,
			codeBlock: /```([\s\S]*?)```/g,
			image: /!\[(.+?)\]\((.+?)\)({width=\d+ height=\d+})?/g
		}
	};
	static execFn = {
		codeBlock: (line) => /^\`{3}([\s\S]*?)\`{3}$/g.exec(line),
		ul: (line) => /^([ ]{0,})?[\-\*\+][ ](\[[ \\x]\])?(.+)$/m.exec(line),
		ol: (line) => /^([ ]{0,})?\d+.[ ](\[[ \\x]\])?(.+)$/m.exec(line),
		heading: (line) => /^(#{1,3}) (.+)$/g.exec(line),
		blockquote: (line) => /^> (.+)$/g.exec(line),
		hr: (line) => /^[\s]*[-*_]{3,}[\s]*$/g.exec(line),
		img: (line) => /^!\[(.+?)\]\((.+?)\)/g.exec(line),
		htmlTag: (line) => /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(line)
	};
	constructor() {}
	splitHtmlStringByBlockElement(html) {
		const codeBlocks = [];
		const placeholder = "###CODEBLOCK###";
		let processedString = html.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
			codeBlocks.push(match);
			return `${placeholder}${codeBlocks.length - 1}${placeholder}`;
		});
		let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\s]{0,}[\-\*\+] +.+$|[\s]{0,}\d+. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm);
		const mappedResult = result.filter((section) => {
			const newLineRegx = /^\s*$/g;
			return !newLineRegx.exec(section);
		}).map((section) => {
			return section.replace(new RegExp(`${placeholder}(\\d+)${placeholder}`, "g"), (match, index) => `${codeBlocks[parseInt(index)]}`);
		});
		return mappedResult;
	}
	generateHTML_From_HtmlArrayOfString(html) {
		let htmlResult = [];
		let listItems = [];
		for (let index = 0; index < html.length; index++) {
			const line = html[index];
			const codeBlockExec = MarkdownParser.execFn.codeBlock(line);
			if (codeBlockExec) {
				if (listItems.length > 0) {
					const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]));
					if (res) {
						htmlResult.push(res.innerHTML);
					}
					listItems = [];
				}
				const [wholeCodeBlock, codeBlockContent] = codeBlockExec;
				htmlResult.push(`<pre data-line='${index}'><code>${codeBlockContent}</code></pre>`);
				continue;
			}
			const ulExec = MarkdownParser.execFn.ul(line);
			const olExec = MarkdownParser.execFn.ol(line);
			if (ulExec || olExec) {
				listItems.push(line);
			} else {
				if (listItems.length > 0) {
					const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]));
					if (res) {
						htmlResult.push(res.innerHTML);
					}
					listItems = [];
				}
				const headingExec = MarkdownParser.execFn.heading(line);
				if (headingExec) {
					const [wholeHeading, headingVariant, headingContent] = headingExec;
					let parsedHeadingContent = this.parseAllInlineElementsWithinAnElement([headingContent]);
					if (headingVariant == "#") {
						htmlResult.push(`<h1 data-line='${index}'>${parsedHeadingContent}</h1>`);
					} else if (headingVariant == "##") {
						htmlResult.push(`<h2 data-line='${index}'>${parsedHeadingContent}</h2>`);
					} else if (headingVariant == "###") {
						htmlResult.push(`<h3 data-line='${index}'>${parsedHeadingContent}</h3>`);
					}
					continue;
				}
				const blockquoteExec = MarkdownParser.execFn.blockquote(line);
				if (blockquoteExec) {
					const [wholeBlockquote, blockquoteContent] = blockquoteExec;
					htmlResult.push(`<blockquote data-line='${index}'>${blockquoteContent}</blockquote>`);
					continue;
				}
				const hrExec = MarkdownParser.execFn.hr(line);
				if (hrExec) {
					htmlResult.push(`<hr data-line='${index}'/>`);
					continue;
				}
				const splittedLines = line.split("\n\n");
				for (const content of splittedLines) {
					if (content.trim()) {
						const tagExec = MarkdownParser.execFn.htmlTag(content);
						if (tagExec) {
							const [wholeHtmlTag] = tagExec;
							htmlResult.push(wholeHtmlTag);
						} else {
							const paragraph = this.parseAllInlineElementsWithinAnElement([content]);
							htmlResult.push(`<p data-line='${index}'>${paragraph}</p>`);
						}
					}
				}
			}
		}
		if (listItems.length > 0) {
			const res = parseList(listItems, (content) => this.parseAllInlineElementsWithinAnElement([content]));
			if (res) {
				htmlResult.push(res.innerHTML);
			}
			listItems = [];
		}
		return htmlResult.join("\n");
	}
	parseAllInlineElementsWithinAnElement(elementMarkdownStringLine) {
		let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
			const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false;
			let preWhitespace = isLastIndex ? " " : "";
			let parsedItemWithRegx = item;
			if (this.rules.inlineItem.image.test(parsedItemWithRegx)) {
				parsedItemWithRegx = item.replace(this.rules.inlineItem.image, preWhitespace + `<img src='$2' alt='$1' $3 />`);
			}
			if (this.rules.inlineItem.codeBlock.test(parsedItemWithRegx)) {
				parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.codeBlock, preWhitespace + "<code>$1</code>");
			}
			if (this.rules.inlineItem.code.test(parsedItemWithRegx)) {
				parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.code, preWhitespace + "<code>$1</code>");
			}
			if (this.rules.inlineItem.bold.test(parsedItemWithRegx)) {
				parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.bold, preWhitespace + "<strong>$1</strong>");
			}
			if (this.rules.inlineItem.italic.test(parsedItemWithRegx)) {
				parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.italic, preWhitespace + "<em>$1</em>");
			}
			if (this.rules.inlineItem.link.test(parsedItemWithRegx)) {
				parsedItemWithRegx = parsedItemWithRegx.replace(this.rules.inlineItem.link, preWhitespace + "<a href=\"$2\">$1</a>");
			}
			acc += preWhitespace + parsedItemWithRegx;
			return acc;
		}, "");
		return joinedStr;
	}
};

//#endregion