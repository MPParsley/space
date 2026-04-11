import { DIALOGUES } from '../data/dialogues.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';

// DialogueScene — NPC conversation modal overlay
// Launched on top of SolarSystemScene + UIScene when docking.

export default class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene', active: false });
  }

  init(data) {
    this.bodyData         = data.bodyData || {};
    this._dialogueOverride = data.dialogue || null;
  }

  create() {
    const { width, height } = this.scale;

    // Semi-transparent backdrop (blocks taps through to game)
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setInteractive();

    // Dialogue box dimensions
    const boxW = Math.min(width - 24, 440);
    const boxH = Math.min(height * 0.72, 420);
    const boxX = (width - boxW) * 0.5;
    const boxY = (height - boxH) * 0.5;

    // Box background
    const bg = this.add.graphics();
    bg.fillStyle(0x050D1A, 0.97);
    bg.fillRoundedRect(boxX, boxY, boxW, boxH, 20);
    bg.lineStyle(2, 0x1E3E7E, 1);
    bg.strokeRoundedRect(boxX, boxY, boxW, boxH, 20);

    // Use override (encounter NPC), registered dialogue, or auto-generated default
    const raw = this._dialogueOverride || DIALOGUES[this.bodyData.id];
    const dialogue = raw || this._makeDefault(this.bodyData);

    // NPC name header
    this.add.text(boxX + 20, boxY + 18, dialogue.npc, {
      fontSize: '20px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: dialogue.color || '#FFD700',
    });

    // Separator line
    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0x1E3E7E, 0.8);
    sepG.lineBetween(boxX + 14, boxY + 50, boxX + boxW - 14, boxY + 50);

    // Greeting / NPC speech area
    this._npcText = this.add.text(boxX + 18, boxY + 60, dialogue.greeting, {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      color: '#CCDDF0',
      wordWrap: { width: boxW - 36 },
      lineSpacing: 5,
    });

    // Choice buttons container
    this._choiceCx = boxX + 18;
    this._choiceCy = boxY + 160;
    this._choiceW = boxW - 36;
    this._choiceItems = [];

    // Dialogue system
    this._ds = new DialogueSystem(dialogue.tree);
    this._showNode(this._ds.node);

    // Close button (top-right)
    const closeBtn = this.add.text(boxX + boxW - 12, boxY + 14, '✕', {
      fontSize: '20px',
      fontFamily: "'Arial', sans-serif",
      color: '#445577',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._close());

    this.cameras.main.fadeIn(250, 0, 5, 20);
  }

  // ------------------------------------------------------------------ private

  _showNode(node) {
    // Remove old choices
    for (const item of this._choiceItems) item.destroy();
    this._choiceItems = [];

    // Update NPC speech
    this._npcText.setText(node.text);

    // Render choice buttons
    let yOff = 0;
    for (let i = 0; i < node.choices.length; i++) {
      const choice = node.choices[i];
      const btn = this.add.text(this._choiceCx, this._choiceCy + yOff,
        `▸  ${choice.text}`, {
          fontSize: '14px',
          fontFamily: "'Arial', sans-serif",
          color: '#88BBFF',
          backgroundColor: '#091624',
          padding: { x: 12, y: 8 },
          fixedWidth: this._choiceW,
          wordWrap: { width: this._choiceW - 28 },
        },
      ).setInteractive({ useHandCursor: true });

      const idx = i;
      btn.on('pointerover', () => btn.setStyle({ color: '#FFFFFF', backgroundColor: '#112244' }));
      btn.on('pointerout', () => btn.setStyle({ color: '#88BBFF', backgroundColor: '#091624' }));
      btn.on('pointerdown', () => {
        const result = this._ds.choose(idx);
        if (result === 'end') {
          this._close();
        } else {
          this._showNode(this._ds.node);
        }
      });

      this._choiceItems.push(btn);
      yOff += btn.height + 8;
    }
  }

  _makeDefault(bodyData) {
    const f = bodyData.facts || [];
    return {
      npc: bodyData.name + ' Station',
      color: '#AACCFF',
      greeting: `Welcome to ${bodyData.name}!`,
      tree: [
        {
          id: 'root',
          text: f[0] || `${bodyData.name} is an amazing place!`,
          choices: [
            { text: 'Tell me more!', next: f[1] ? 'more' : null },
            { text: 'Goodbye!', next: null },
          ],
        },
        ...(f[1] ? [{
          id: 'more',
          text: f[1],
          choices: [
            { text: f[2] ? 'One more fact!' : 'Amazing! Bye!', next: f[2] ? 'more2' : null },
            { text: 'Thanks, bye!', next: null },
          ],
        }] : []),
        ...(f[2] ? [{
          id: 'more2',
          text: f[2],
          choices: [{ text: 'Incredible! Goodbye!', next: null }],
        }] : []),
      ],
    };
  }

  _close() {
    this.cameras.main.fadeOut(250, 0, 5, 20);
    this.time.delayedCall(270, () => this.scene.stop('DialogueScene'));
  }
}
