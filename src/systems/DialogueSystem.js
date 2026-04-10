// DialogueSystem — walks a dialogue tree
// Each node: { id, text, choices: [{ text, next }] }
// next: string (next node id) | null (end conversation)

export class DialogueSystem {
  constructor(tree) {
    this.tree = tree;
    this._index = {};
    for (const node of tree) {
      this._index[node.id] = node;
    }
    this.currentNode = this._index['root'] || tree[0];
  }

  get node() {
    return this.currentNode;
  }

  choose(choiceIndex) {
    const choice = this.currentNode.choices[choiceIndex];
    if (!choice) return false;

    if (choice.next === null) {
      return 'end';
    }

    const next = this._index[choice.next];
    if (!next) return 'end';

    this.currentNode = next;
    return 'continue';
  }

  reset() {
    this.currentNode = this._index['root'] || this.tree[0];
  }
}
