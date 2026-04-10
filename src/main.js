// main.js — Phaser game configuration and boot
// Phaser 3 is loaded via CDN <script> tag before this module executes,
// so `Phaser` is available as a global here.

import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import SolarSystemScene from './scenes/SolarSystemScene.js';
import UIScene from './scenes/UIScene.js';
import DialogueScene from './scenes/DialogueScene.js';

const config = {
  type: Phaser.AUTO,           // WebGL when available, Canvas fallback
  parent: 'game-container',
  backgroundColor: '#000818',

  scale: {
    mode: Phaser.Scale.RESIZE, // always fills the browser viewport
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  input: {
    activePointers: 3,         // support pinch (needs 2+ simultaneous touches)
  },

  // No physics engine needed — ship movement uses manual steering
  scene: [BootScene, MenuScene, SolarSystemScene, UIScene, DialogueScene],
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
