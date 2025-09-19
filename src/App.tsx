import { useEffect } from 'react'
import { BaseMarkdownParser } from './parsers/BaseMarkdownParser'

export default function App() {
   useEffect(() => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement
      const viewer = document.querySelector("div.viewer") as Element

      fetch('/text.txt')
         .then(response => response.text())
         .then((data) => {
            textarea.value = data
            const parsedContent = BaseMarkdownParser.parsers.preParseRawMarkdownString(data)
            let finalHtml = BaseMarkdownParser.parsers.parseRawMarkdownStringAndConvertToHtml(parsedContent)
            viewer.innerHTML = finalHtml
         })


      textarea.addEventListener("input", (e) => {
         // @ts-ignore
         const parsedContent = BaseMarkdownParser.parsers.preParseRawMarkdownString(e.target.value)
         let finalHtml = BaseMarkdownParser.parsers.parseRawMarkdownStringAndConvertToHtml(parsedContent)
         viewer.innerHTML = finalHtml
      })


      function addCopyButton(pre: Element) {
         const copyBtn = document.createElement("button")
         copyBtn.classList.add("copy-btn")
         copyBtn.textContent = "copy"

         pre.appendChild(copyBtn)

         copyBtn.addEventListener('click', () => {
            const code = pre.querySelector('code');
            if (!code) return
            navigator.clipboard.writeText(code.textContent as string)
               .then(() => {
                  copyBtn.textContent = 'Copied!';
                  setTimeout(() => (copyBtn.textContent = 'Copy'), 2000);
               })
               .catch(err => console.error('Failed to copy:', err));
         });
      }

      const observerCallback: MutationCallback = (mutations) => {
         mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
               if (node.nodeType === Node.ELEMENT_NODE) {
                  //@ts-ignore
                  if (node.tagName.toLowerCase() === 'pre') {
                     addCopyButton(node as Element);
                  } else {
                     //@ts-ignore
                     node.querySelectorAll?.('pre').forEach(addCopyButton);
                  }
               }
            });

            mutation.removedNodes.forEach(node => {
               //@ts-ignore
               if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'pre') {
                  const btn = node.parentNode?.querySelector?.('.copy-btn');
                  if (btn) btn.remove();
               }
            });
         });
      };

      const observer = new MutationObserver(observerCallback);
      observer.observe(document.body, {
         childList: true,
         subtree: true
      });

      document.querySelectorAll('pre').forEach(addCopyButton);
   }, [])

   return (
      <>
         <div className="fixed-bg"></div>

         <h1 className="main-heading">Markdown Parser</h1>

         <div className="container">
            <textarea className="markdown-editor"></textarea>
            <div className="viewer markdown-body"></div>
         </div>
      </>
   )
}
