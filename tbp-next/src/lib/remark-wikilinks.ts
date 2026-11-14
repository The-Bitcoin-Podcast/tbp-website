import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, Link, Parent } from "mdast";

export const remarkWikilinks: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      const regex = /\[\[([^\]]+)\]\]/g;
      const value = node.value;
      let match;
      const parts: (Text | Link)[] = [];
      let lastIndex = 0;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            value: value.slice(lastIndex, match.index),
          });
        }

        // [[Target]] or [[Target|Label]]
        const [target, label] = match[1].split("|");
        const linkText = (label ?? target).trim();
        // Same URL form as toUrlSlug() in content.ts.
        const href = `/people/${encodeURIComponent(target.trim().replace(/ /g, "-"))}`;

        parts.push({
          type: "link",
          url: href,
          children: [{ type: "text", value: linkText }],
        } as Link);

        lastIndex = match.index + match[0].length;
      }

      if (parts.length > 0) {
        if (lastIndex < value.length) {
          parts.push({
            type: "text",
            value: value.slice(lastIndex),
          });
        }
        (parent.children as (Text | Link)[]).splice(index, 1, ...parts);
      }
    });
  };
};
