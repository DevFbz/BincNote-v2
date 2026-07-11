// Block types and conversion utilities for the Notion-like block editor

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "divider";

export interface BlockData {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // for todo items
}

let _blockIdCounter = 0;
export function generateBlockId(): string {
  return `blk_${Date.now()}_${++_blockIdCounter}`;
}

/** Create a fresh empty block of the given type */
export function createBlock(type: BlockType = "paragraph", content: string = ""): BlockData {
  return { id: generateBlockId(), type, content: content || (type === "divider" ? "---" : "") };
}

/** Convert a single BlockData to a TipTap JSON node */
function blockToNode(b: BlockData): any {
  switch (b.type) {
    case "heading1":
      return { type: "heading", attrs: { level: 1 }, content: b.content ? [{ type: "text", text: b.content }] : undefined };
    case "heading2":
      return { type: "heading", attrs: { level: 2 }, content: b.content ? [{ type: "text", text: b.content }] : undefined };
    case "heading3":
      return { type: "heading", attrs: { level: 3 }, content: b.content ? [{ type: "text", text: b.content }] : undefined };
    case "bulleted_list":
      return { type: "bulletList", content: [{ type: "listItem", content: b.content ? [{ type: "paragraph", content: [{ type: "text", text: b.content }] }] : [{ type: "paragraph" }] }] };
    case "numbered_list":
      return { type: "orderedList", content: [{ type: "listItem", content: b.content ? [{ type: "paragraph", content: [{ type: "text", text: b.content }] }] : [{ type: "paragraph" }] }] };
    case "todo":
      return { type: "taskList", content: [{ type: "taskItem", attrs: { checked: b.checked ?? false }, content: b.content ? [{ type: "paragraph", content: [{ type: "text", text: b.content }] }] : [{ type: "paragraph" }] }] };
    case "divider":
      return { type: "horizontalRule" };
    default:
      return { type: "paragraph", content: b.content ? [{ type: "text", text: b.content }] : undefined };
  }
}

/** Convert blocks array to TipTap doc JSON (for persistence) */
export function blocksToDoc(blocks: BlockData[]): any {
  return { type: "doc", content: blocks.map(blockToNode) };
}

/** Extract plain text from a TipTap node */
function extractText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.content && Array.isArray(node.content)) return node.content.map(extractText).join("");
  return "";
}

/** Convert a single TipTap node to BlockData */
function nodeToBlock(node: any): BlockData | null {
  if (!node || !node.type) return null;
  const id = generateBlockId();

  switch (node.type) {
    case "paragraph": {
      const text = extractText(node);
      return { id, type: "paragraph", content: text };
    }
    case "heading": {
      const level = node.attrs?.level || 1;
      const type = level === 1 ? "heading1" : level === 2 ? "heading2" : "heading3" as BlockType;
      return { id, type, content: extractText(node) };
    }
    case "bulletList": {
      const items = node.content || [];
      const content = items.map((li: any) => extractText(li.content?.[0])).join("\n");
      return { id, type: "bulleted_list", content };
    }
    case "orderedList": {
      const items = node.content || [];
      const content = items.map((li: any) => extractText(li.content?.[0])).join("\n");
      return { id, type: "numbered_list", content };
    }
    case "taskList": {
      const items = node.content || [];
      // Take only the first task item for the block
      const first = items[0];
      if (!first) return { id, type: "todo", content: "", checked: false };
      return {
        id,
        type: "todo",
        content: extractText(first.content?.[0]),
        checked: first.attrs?.checked ?? false,
      };
    }
    case "horizontalRule":
      return { id, type: "divider", content: "---" };
    default:
      return null;
  }
}

/** Convert a TipTap doc JSON back to blocks array */
export function docToBlocks(doc: any): BlockData[] {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return [createBlock("paragraph")];
  }
  const blocks: BlockData[] = [];
  for (const node of doc.content) {
    if (!node) continue;
    // Flatten bulletList/orderedList/taskList into multiple blocks
    if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
      const items = node.content || [];
      for (const li of items) {
        if (!li) continue;
        const bType = node.type === "bulletList" ? "bulleted_list" as BlockType
          : node.type === "orderedList" ? "numbered_list" as BlockType
          : "todo" as BlockType;
        const id = generateBlockId();
        if (bType === "todo") {
          blocks.push({
            id, type: "todo",
            content: extractText(li.content?.[0]),
            checked: li.attrs?.checked ?? false,
          });
        } else {
          blocks.push({
            id, type: bType,
            content: extractText(li.content?.[0]),
          });
        }
      }
    } else {
      const b = nodeToBlock(node);
      if (b) blocks.push(b);
    }
  }
  return blocks.length > 0 ? blocks : [createBlock("paragraph")];
}
