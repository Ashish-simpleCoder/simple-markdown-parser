//#region src/MarkdownParser.tsx
var MarkdownParser = class {
	rules = {
		h1: /^# (.+)$/gm,
		h2: /^## (.+)$/gm,
		h3: /^### (.+)$/gm,
		bold: /\*\*(.+?)\*\*/g,
		italic: /\*(.+?)\*/g,
		code: /`(.+?)`/g,
		link: /\[(.+?)\]\((.+?)\)/g,
		image: /!\[(.+?)\]\((.+?)\)/g,
		unorderedList: /^[\s]*[\-\*\+][\s]+(.+)$/gm,
		orderedList: /^[\s]*\d+\.[\s]+(.+)$/gm,
		codeBlock: /```([\s\S]*?)```/g,
		blockquote: /^>[\s]*(.+)$/gm,
		hr: /^[\s]*[-*_]{3,}[\s]*$/gm
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
			const olExec = /^\d. (.+)$/g.exec(line);
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
	parse(markdown) {
		let html = markdown;
		/**
		* ```
		awesome
		# h1
		* ```
		
		*/
		html = this.parseCodeBlocks(html);
		html = this.parseHeaders(html);
		html = this.parseBlockquotes(html);
		html = this.parseHorizontalRules(html);
		html = this.parseLists(html);
		html = this.parseImages(html);
		html = this.parseLinks(html);
		html = this.parseEverythingElse(html);
		return html.trim();
	}
	parseHeaders(html) {
		html = html.replace(this.rules.h1, "<h1>$1</h1>");
		html = html.replace(this.rules.h2, "<h2>$1</h2>");
		html = html.replace(this.rules.h3, "<h3>$1</h3>");
		return html;
	}
	parseInlineFormatting(html, startWhiteSpace = "") {
		html = html.replace(this.rules.bold, startWhiteSpace + "<strong>$1</strong>");
		html = html.replace(this.rules.italic, startWhiteSpace + "<em>$1</em>");
		html = html.replace(this.rules.codeBlock, startWhiteSpace + "<code>$1</code>");
		html = html.replace(this.rules.code, startWhiteSpace + "<code>$1</code>");
		html = this.parseLinks(startWhiteSpace + html);
		return html;
	}
	parseLinks(html) {
		return html.replace(this.rules.link, "<a href=\"$2\">$1</a>");
	}
	parseImages(html) {
		return html.replace(this.rules.image, "<img src=\"$2\" alt=\"$1\">");
	}
	parseCodeBlocks(html) {
		return html.replace(this.rules.codeBlock, "<pre><code>$1</code><button class=\"copy-btn\">copy</button></pre>");
	}
	parseBlockquotes(html) {
		return html.replace(this.rules.blockquote, "<blockquote>$1</blockquote>");
	}
	parseHorizontalRules(html) {
		return html.replace(this.rules.hr, "<hr>");
	}
	parseLists(html) {
		const lines = html.split("\n");
		const result = [];
		let inUnorderedList = false;
		let inOrderedList = false;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (this.rules.unorderedList.test(line)) {
				if (inOrderedList) {
					result.push("</ol>");
					inOrderedList = false;
				}
				if (!inUnorderedList) {
					result.push("<ul>");
					inUnorderedList = true;
				}
				const match = line.match(this.rules.unorderedList);
				result.push(`<li>${match[0].split(this.rules.unorderedList)[1]}</li>`);
			} else if (this.rules.orderedList.test(line)) {
				if (inUnorderedList) {
					result.push("</ul>");
					inUnorderedList = false;
				}
				if (!inOrderedList) {
					result.push("<ol>");
					inOrderedList = true;
				}
				const match = line.match(this.rules.orderedList);
				result.push(`<li>${match[0].split(this.rules.orderedList)[1]}</li>`);
			} else {
				if (inUnorderedList) {
					result.push("</ul>");
					inUnorderedList = false;
				}
				if (inOrderedList) {
					result.push("</ol>");
					inOrderedList = false;
				}
				result.push(line);
			}
		}
		if (inUnorderedList) result.push("</ul>");
		if (inOrderedList) result.push("</ol>");
		return result.join("\n");
	}
	parseAllInlineElementsWithinAnElement(elementMarkdownStringLine) {
		let joinedStr = elementMarkdownStringLine.reduce((acc, item, index) => {
			const isLastIndex = elementMarkdownStringLine.length > 1 ? index == elementMarkdownStringLine.length - 1 : false;
			let preWhitespace = isLastIndex ? " " : "";
			if (this.rules.bold.test(item) || this.rules.italic.test(item) || this.rules.codeBlock.test(item) || this.rules.code.test(item) || this.rules.link.test(item)) {
				let mappedItem = this.parseInlineFormatting(item, preWhitespace);
				return acc += preWhitespace + mappedItem;
			} else {
				acc += preWhitespace + item;
			}
			return acc;
		}, "");
		return joinedStr;
	}
	parseEverythingElse(html) {
		const lines = html.split("\n");
		const result = [];
		let currentParagraph = [];
		let preTagContent = [];
		for (const line of lines) {
			const trimmedLine = line.trim();
			const isStartingWithPreTag = preTagStartRegx.exec(line);
			const isEndingWithPreTag = preTagEndRegx.exec(line);
			if (isStartingWithPreTag && isEndingWithPreTag) {
				result.push(line);
				preTagContent = [];
				continue;
			}
			if (isStartingWithPreTag && !isEndingWithPreTag) {
				preTagContent = [];
				preTagContent.push(line);
				continue;
			}
			if (!isStartingWithPreTag && isEndingWithPreTag) {
				preTagContent.push(line);
				result.push(preTagContent.join("\n"));
				preTagContent = [];
				continue;
			}
			if (preTagContent.length > 0) {
				preTagContent.push(line);
				continue;
			}
			if (trimmedLine === "" || trimmedLine.startsWith("<") || trimmedLine.includes("</")) {
				if (currentParagraph.length > 0) {
					let joinedStr = this.parseAllInlineElementsWithinAnElement(currentParagraph);
					result.push("<p>" + joinedStr + "</p>");
					currentParagraph = [];
				}
				result.push(this.parseAllInlineElementsWithinAnElement([line]));
			} else {
				currentParagraph.push(trimmedLine);
			}
		}
		if (currentParagraph.length > 0) {
			let joinedStr = this.parseAllInlineElementsWithinAnElement(currentParagraph);
			result.push("<p>" + joinedStr + "</p>");
		}
		return result.join("\n");
	}
};
let preTagStartRegx = /(\s?)<pre>/g;
let preTagEndRegx = /<\/pre>(\s?)/g;

//#endregion