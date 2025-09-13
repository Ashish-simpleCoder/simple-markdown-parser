import { useEffect } from 'react'
import { MarkdownParser } from './MarkdownParser'

export default function App() {
   useEffect(() => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement 
      const viewer = document.querySelector("div.viewer") as Element 

      fetch('public/text.txt')
         .then(response => response.text())
         .then((data) => {
            textarea.value = data
            const parsedContent = Parser.splitHtmlStringByBlockElement(data)
            let finalHtml = Parser.generateHTML_From_HtmlArrayOfString(parsedContent)
            viewer.innerHTML = finalHtml
         })

      const Parser = new MarkdownParser()

      textarea.addEventListener("input", (e) => {
         //@ts-ignore
         const parsedContent = Parser.splitHtmlStringByBlockElement(e.target.value)
         let finalHtml = Parser.generateHTML_From_HtmlArrayOfString(parsedContent)
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

      const observerCallback:MutationCallback = (mutations) => {
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
   },[])

   return (
      <></>
   )
}
