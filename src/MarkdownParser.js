//#region src/MarkdownParser.tsx
var MarkdownParser = class {
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
			image: /!\[(.+?)\]\((.+?)\)/g
		}
	};
	execFn = {
		codeBlock: (line) => /^\`{3}([\s\S]*?)\`{3}$/g.exec(line),
		ul: (line) => /^[\-\*\+][\s]+(.+)$/g.exec(line),
		ol: (line) => /^\d+. (.+)$/g.exec(line),
		heading: (line) => /^(#{1,3}) (.+)$/g.exec(line),
		blockquote: (line) => /^> (.+)$/g.exec(line),
		hr: (line) => /^[\s]*[-*_]{3,}[\s]*$/g.exec(line),
		img: (line) => /^!\[(.+?)\]\((.+?)\)/g.exec(line),
		htmlTag: (line) => /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(line)
	};
	constructor() {}
	splitByBlockElementMarkdown(html) {
		const codeBlocks = [];
		const placeholder = "###CODEBLOCK###";
		let processedString = html.replace(/\`{3}[\s\S]*?\`{3}/gm, (match) => {
			codeBlocks.push(match);
			return `${placeholder}${codeBlocks.length - 1}${placeholder}`;
		});
		let result = processedString.split(/^(#{1,3} .+$|> *.+$|[\s]*[-*_]{3,}[\s]*$|[\-\*\+][\s]+.+$|\d. .+$|[.+\n]|###CODEBLOCK###\d+###CODEBLOCK###$)/gm);
		const mappedResult = result.filter((section) => {
			const newLineRegx = /^\s*$/g;
			return !newLineRegx.exec(section);
		}).map((section) => {
			return section.replace(new RegExp(`${placeholder}(\\d+)${placeholder}`, "g"), (match, index) => `${codeBlocks[parseInt(index)]}`);
		});
		return mappedResult;
	}
	convertToElement(html) {
		let htmlResult = [];
		let isULRunning = false;
		let isOLRunning = false;
		for (let index = 0; index < html.length; index++) {
			const line = html[index];
			const codeBlockExec = this.execFn.codeBlock(line);
			if (codeBlockExec) {
				if (isOLRunning) {
					htmlResult.push("</ol>");
					isOLRunning = false;
				}
				if (isULRunning) {
					htmlResult.push("</ul>");
					isULRunning = false;
				}
				const [wholeCodeBlock, codeBlockContent] = codeBlockExec;
				htmlResult.push(`<pre data-line='${index}'><code>${codeBlockContent}</code></pre>`);
				continue;
			}
			const ulExec = this.execFn.ul(line);
			const olExec = this.execFn.ol(line);
			if (ulExec) {
				if (isOLRunning) {
					htmlResult.push("</ol>");
					isOLRunning = false;
				}
				if (!isULRunning) {
					htmlResult.push(`<ul data-line='${index}'>`);
					isULRunning = true;
				}
				const [wholeUl, ulContent] = ulExec;
				let parsedUlContent = this.parseAllInlineElementsWithinAnElement([ulContent]);
				htmlResult.push(`<li data-line='${index}'>${parsedUlContent}</li>`);
			} else if (olExec) {
				if (isULRunning) {
					htmlResult.push("</ul>");
					isULRunning = false;
				}
				if (!isOLRunning) {
					htmlResult.push(`<ol data-line='${index}'>`);
					isOLRunning = true;
				}
				const [wholeOl, olContent] = olExec;
				let parsedOlContent = this.parseAllInlineElementsWithinAnElement([olContent]);
				htmlResult.push(`<li data-line='${index}'>${parsedOlContent}</li>`);
			} else {
				if (isOLRunning) {
					htmlResult.push("</ol>");
					isOLRunning = false;
				}
				if (isULRunning) {
					htmlResult.push("</ul>");
					isULRunning = false;
				}
				const headingExec = this.execFn.heading(line);
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
				const blockquoteExec = this.execFn.blockquote(line);
				if (blockquoteExec) {
					const [wholeBlockquote, blockquoteContent] = blockquoteExec;
					htmlResult.push(`<blockquote data-line='${index}'>${blockquoteContent}</blockquote>`);
					continue;
				}
				const hrExec = this.execFn.hr(line);
				if (hrExec) {
					htmlResult.push(`<hr data-line='${index}'/>`);
					continue;
				}
				const splittedLines = line.split("\n\n");
				for (const content of splittedLines) {
					const imgExec = /^!\[(.+?)\]\((.+?)\)/gm.exec(content);
					if (imgExec) {
						const [wholeImg, imgAlt, imgSrc] = imgExec;
						htmlResult.push(`<img data-line='${index}' src='${imgSrc}' alt='${imgAlt}' />`);
						continue;
					}
					if (content.trim()) {
						const tagExec = this.execFn.htmlTag(content);
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
		if (isOLRunning) {
			htmlResult.push("</ol>");
			isOLRunning = false;
		}
		if (isULRunning) {
			htmlResult.push("</ul>");
			isULRunning = false;
		}
		return htmlResult.join("\n");
	}
	parseInlineFormatting(html, startWhiteSpace = "") {
		html = html.replace(this.rules.inlineItem.bold, startWhiteSpace + "<strong>$1</strong>");
		html = html.replace(this.rules.inlineItem.italic, startWhiteSpace + "<em>$1</em>");
		html = html.replace(this.rules.inlineItem.link, startWhiteSpace + "<a href=\"$2\">$1</a>");
		return html;
	}
	parseAllInlineElementsWithinAnElement(elementMarkdownStringLine) {
		let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
			const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false;
			let preWhitespace = isLastIndex ? " " : "";
			let parsedItemWithRegx = item;
			if (this.rules.inlineItem.codeBlock.test(item)) {
				parsedItemWithRegx = item.replace(this.rules.inlineItem.codeBlock, preWhitespace + "<code>$1</code>");
			} else if (this.rules.inlineItem.code.test(item)) {
				parsedItemWithRegx = item.replace(this.rules.inlineItem.code, preWhitespace + "<code>$1</code>");
			} else if (this.rules.inlineItem.bold.test(item) || this.rules.inlineItem.italic.test(item) || this.rules.inlineItem.link.test(item)) {
				parsedItemWithRegx = this.parseInlineFormatting(item, preWhitespace);
			}
			acc += preWhitespace + parsedItemWithRegx;
			return acc;
		}, "");
		return joinedStr;
	}
};

//#endregion