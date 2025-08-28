//#region src/MarkdownParser.tsx
var MarkdownParser = class {
	rules = {
		h1: /^# (.+)$/gm,
		h2: /^## (.+)$/gm,
		h3: /^### (.+)$/gm,
		bold: /\*\*(.+?)\*\*/g,
		italic: /\*(.+?)\*/g,
		link: /\[(.+?)\]\((.+?)\)/g,
		code: /`(.+?)`/g,
		codeBlock: /```([\s\S]*?)```/g,
		image: /!\[(.+?)\]\((.+?)\)/g,
		unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
		orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,
		blockquote: /^> (.+)$/g,
		hr: /^[\s]*[-*_]{3,}[\s]*$/g
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
			const codeBlockExec = /^\`{3}([\s\S]*?)\`{3}$/gm.exec(line);
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
			const ulExec = /^[\-\*\+][\s]+(.+)$/g.exec(line);
			const olExec = /^\d+. (.+)$/g.exec(line);
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
				const headingExec = /^(#{1,3}) (.+)$/g.exec(line);
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
				const blockquoteExec = /^> (.+)$/g.exec(line);
				if (blockquoteExec) {
					const [wholeBlockquote, blockquoteContent] = blockquoteExec;
					htmlResult.push(`<blockquote data-line='${index}'>${blockquoteContent}</blockquote>`);
					continue;
				}
				const hrExec = /^[\s]*[-*_]{3,}[\s]*$/g.exec(line);
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
						const tagExec = /<([a-z]*)\b[^>]*>(.*?)<\/\1>/.exec(content);
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
		html = html.replace(this.rules.bold, startWhiteSpace + "<strong>$1</strong>");
		html = html.replace(this.rules.italic, startWhiteSpace + "<em>$1</em>");
		html = html.replace(this.rules.link, startWhiteSpace + "<a href=\"$2\">$1</a>");
		return html;
	}
	parseAllInlineElementsWithinAnElement(elementMarkdownStringLine) {
		let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
			const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false;
			let preWhitespace = isLastIndex ? " " : "";
			let parsedItemWithRegx = item;
			if (this.rules.codeBlock.test(item)) {
				parsedItemWithRegx = item.replace(this.rules.codeBlock, preWhitespace + "<code>$1</code>");
			} else if (this.rules.code.test(item)) {
				parsedItemWithRegx = item.replace(this.rules.code, preWhitespace + "<code>$1</code>");
			} else if (this.rules.bold.test(item) || this.rules.italic.test(item) || this.rules.link.test(item)) {
				parsedItemWithRegx = this.parseInlineFormatting(item, preWhitespace);
			}
			acc += preWhitespace + parsedItemWithRegx;
			return acc;
		}, "");
		return joinedStr;
	}
};

//#endregion