import React from "react"
import StyleToJS from "style-to-js"

import { HTML_ATTRIBUTES_MAP, HTML_BOOLEAN_ATTRIBUTES_SET, HTML_NODE_NAMES_SET } from "./constant"

export default function convertDomToReact(
  nodes: NodeListOf<ChildNode & { data?: string; attributes?: NamedNodeMap }>,
): React.ReactNode[] {
  const reactElements: React.ReactNode[] = []

  for (let currIndex = 0; currIndex < nodes.length; currIndex++) {
    const currNode = nodes[currIndex]
    const nodeName: keyof typeof HTML_NODE_NAMES_SET | any = currNode.nodeName.toLowerCase()

    if (nodeName === "#text") {
      if (currNode.data && currNode.data !== "\n") {
        reactElements.push(currNode.data)
      }
      continue
    }

    // Skip script (prevent xss) and invalid html nodes
    if (!HTML_NODE_NAMES_SET.has(nodeName) || nodeName === "script") {
      continue
    }

    let props: Record<string, any> = {}

    if (currNode.attributes) {
      props = attributesToProps(currNode.attributes)
    }

    props.key = currIndex

    const isSelfClosing = nodeName === "hr" || nodeName === "img" || nodeName === "br" || nodeName === "input" || nodeName === "textarea"

    if (isSelfClosing) {
      reactElements.push(React.createElement(nodeName, props))
    } else {
      const children = convertDomToReact(currNode.childNodes)
      reactElements.push(React.createElement(nodeName, props, children))
    }
  }

  return reactElements
}

function attributesToProps(attributes: NamedNodeMap): Record<string, any> {
  const props: Record<string, any> = {}

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i]
    const attrNameLower = attr.name.toLowerCase()

    // data-attributes, aria-attributes, role
    if (attrNameLower.startsWith("data-") || attrNameLower.startsWith("aria-") || attrNameLower === "role") {
      props[attr.name] = attr.value
      continue
    }

    // Style parsing
    if (attrNameLower === "style") {
      if (typeof attr.value === "string" && attr.value.trim().length > 0) {
        const style = StyleToJS(attr.value, { reactCompat: true })
        props.style = style
      }
      continue
    }

    // Event keys - skip all handlers
    if (attrNameLower.startsWith("on")) {
      continue
    }

    const propertyName = HTML_ATTRIBUTES_MAP[attrNameLower as keyof typeof HTML_ATTRIBUTES_MAP]

    if (propertyName) {
      if (HTML_BOOLEAN_ATTRIBUTES_SET.has(propertyName)) {
        // Handle boolean attributes
        const isTrue = attr.value !== "false" // Treat any value other than "false" as true for boolean attributes
        if (propertyName === "checked") {
          props.defaultChecked = isTrue // React uses defaultChecked for initial checked state
        } else {
          props[propertyName] = isTrue
        }
      } else {
        props[propertyName] = attr.value
      }
      continue
    }

    // If not a mapped attribute, add as-is (e.g., custom attributes not starting with data-/aria-)
    props[attr.name] = attr.value
  }
  return props
}
