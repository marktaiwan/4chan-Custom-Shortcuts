// ==UserScript==
// @name         4chan Custom Shortcuts
// @description  Configurable shortcuts and enhanced keyboard navigation. "Ctrl+Shift+/" to open settings.
// @version      1.1.5
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/4chan-Custom-Shortcuts
// @supportURL   https://github.com/marktaiwan/4chan-Custom-Shortcuts/issues
// @match        https://boards.4channel.org/*
// @match        https://boards.4chan.org/*
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

(function () {
'use strict';

let lastSelected = null;
const SCRIPT_ID = 'markers_custom_shortcuts';
const CSS = `/* Generated by Custom Shortcuts */
#${SCRIPT_ID}--panelWrapper {
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 10;
  display: flex;
  width: 100vw;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background-color: rgba(0,0,0,0.5);
}

#${SCRIPT_ID}--close-button {
  background-color: transparent;
  border: 1px solid rgba(0,0,0,0.4);
  cursor: pointer;
}

.${SCRIPT_ID}--header {
  padding-bottom: 5px;
}

.${SCRIPT_ID}--body {
  width: 600px;
  padding: 6px;
  max-height: calc(100vh - 80px);
  overflow: auto;
}

.${SCRIPT_ID}--table {
  display: grid;
  grid-template-columns: 1fr 150px 150px;
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.${SCRIPT_ID}--table input {
  font-size: 12px;
  align-self: center;
  text-align: center;
}

.highlighted {
  box-shadow: 0px 0px 0px 4px coral;
}
`;

/*
 *  - 'key' uses KeyboardEvent.code to represent keypress.
 *    For instance, 's' would be 'KeyS' and '5' would be either 'Digit5' or
 *    'Numpad5'.
 *  - 'ctrl', 'alt', 'shift' are Booleans and defaults to false if not present.
 */
const presets = {
  default: {
    prev:        [{key: 'KeyB'}],
    next:        [{key: 'KeyN'}],
    toIndex:     [{key: 'KeyI'}],
    toCatelog:   [{key: 'KeyC'}],
    focusSearch: [{key: 'KeyS'}],
  },
  preset_1: {
    scrollUp:          [{key: 'KeyW'}, {key: 'ArrowUp'}],
    scrollDown:        [{key: 'KeyS'}, {key: 'ArrowDown'}],
    scrollLeft:        [{key: 'KeyA'}, {key: 'ArrowLeft'}],
    scrollRight:       [{key: 'KeyD'}, {key: 'ArrowRight'}],
    pageUp:            [{key: 'KeyW', shift: true}],
    pageDown:          [{key: 'KeyS', shift: true}],
    prevExpanded:      [],
    nextExpanded:      [],
    toggleKeyboardNav: [{key: 'KeyQ'}],
    openSelected:      [{key: 'KeyE'}],
    openInNewTab:      [],
    openInBackground:  [{key: 'KeyE', shift: true}],
    prev:              [{key: 'KeyZ'}],
    next:              [{key: 'KeyX'}],
    toPost:            [],
    toIndex:           [{key: 'KeyI'}],
    toCatelog:         [{key: 'KeyC'}],
    toggleSound:       [{key: 'KeyM'}],
    toggleVideo:       [{key: 'KeyN'}],
    focusSearch:       [{key: 'KeyF', shift: true}],
    threadUpdate:      [{key: 'KeyR', shift: true}],
    historyBack:       [{key: 'KeyA', shift: true}],
    historyForward:    [{key: 'KeyD', shift: true}],
  },
  preset_2: {},
  preset_3: {},

  /* Keybinds that are applied globally */
  global: {
    useDefault:  [{key: 'Backquote', alt: true}],
    usePreset_1: [{key: 'Digit1', alt: true}],
    usePreset_2: [{key: 'Digit2', alt: true}],
    usePreset_3: [{key: 'Digit3', alt: true}]
  },

  /* Special non-configurable keybinds */
  reserved: {
    unfocus: [{key: 'Escape'}],
    toggleSettings: [{key: 'Slash', ctrl: true, shift: true}],
  }
};

const reservedKeys = [
  'Escape',
  'Backspace',
  'Delete',
  'Meta',
  'ContextMenu',
  // 'Enter',
  // 'Tab',
  // 'CapsLock',
  // 'ScrollLock',
  // 'NumLock',
];

/*
 *  'constant' executes the command twice, on keydown and keyup.
 *
 *  'repeat' indicates whether the command should act on
 *  subsequent events generated by the key being held down.
 *  Defaults to false.
 *
 *  'input' indicates whether the command should execute when an
 *  input field has focus.
 *  Defaults to false.
 *
 *  'global' indicates whether the keybind applies to all presets.
 *  Defaults to false.
 */
const actions = {
  scrollUp: {
    name: 'Scroll up',
    fn: event => scroll('up', event),
    constant: true,
    repeat: true
  },
  scrollDown: {
    name: 'Scroll down',
    fn: event => scroll('down', event),
    constant: true,
    repeat: true
  },
  scrollLeft: {
    name: 'Scroll left',
    fn: event => scroll('left', event),
    constant: true,
    repeat: true
  },
  scrollRight: {
    name: 'Scroll right',
    fn: event => scroll('right', event),
    constant: true,
    repeat: true
  },
  pageUp: {
    name: 'Page up',
    fn: event => {
      const mediaBox = $('.highlighted');
      const scrollAmount = document.documentElement.clientHeight * 0.9;

      if (mediaBox && getPageType() !== 'catalog') {
        // get nearest non visible
        const selector = 'a.fileThumb:last-child, video.expandedWebm';
        const nodeList = $$(selector);
        let position = [...nodeList].indexOf(mediaBox);
        let thumb = mediaBox;

        while (position > 0) {
          thumb = nodeList[--position];
          if (!isVisible(thumb)) break;
        }

        highlight(thumb, !event.repeat);
      } else {
        window.scrollBy(0, -scrollAmount);
      }
    },
    repeat: true
  },
  pageDown: {
    name: 'Page down',
    fn: event => {
      const mediaBox = $('.highlighted');
      const scrollAmount = document.documentElement.clientHeight * 0.9;

      if (mediaBox && getPageType() !== 'catalog') {
        // get nearest non visible
        const selector = 'a.fileThumb:last-child, video.expandedWebm';
        const nodeList = $$(selector);
        let position = [...nodeList].indexOf(mediaBox);
        let thumb = mediaBox;

        while (position < nodeList.length - 1) {
          thumb = nodeList[++position];
          if (!isVisible(thumb)) break;
        }

        highlight(thumb, !event.repeat);
      } else {
        window.scrollBy(0, scrollAmount);
      }
    },
    repeat: true
  },
  prevExpanded: {
    name: 'Previous expanded image',
    fn: event => {
      const ele = $('.highlighted');
      if (!ele || getPageType() == 'catalog') return;

      const smooth = !event.repeat;
      const selector = 'a.fileThumb:last-child, video.expandedWebm';
      const nodeList = $$(selector);
      let position = [...nodeList].indexOf(ele);

      while (position > 0) {
        const current = nodeList.item(--position);
        if (current.matches('video') || $('.expanded-thumb', current)) {
          highlight(current, smooth);
          return;
        }
      }
    },
    repeat: true
  },
  nextExpanded: {
    name: 'Next expanded image',
    fn: event => {
      const ele = $('.highlighted');
      if (!ele || getPageType() == 'catalog') return;

      const smooth = !event.repeat;
      const selector = 'a.fileThumb:last-child, video.expandedWebm';
      const nodeList = $$(selector);
      let position = [...nodeList].indexOf(ele);

      while (position < nodeList.length - 1) {
        const current = nodeList.item(++position);
        if (current.matches('video') || $('.expanded-thumb', current)) {
          highlight(current, smooth);
          return;
        }
      }
    },
    repeat: true
  },
  toggleKeyboardNav: {
    name: 'Toggle keyboard navigation',
    fn: () => {
      const highlightedElement = $('.highlighted');
      let highlightedElementSelector;

      switch (getPageType()) {
        case 'index': case 'thread':
          highlightedElementSelector = 'a.fileThumb:last-child, video.expandedWebm';
          break;
        case 'catalog':
          highlightedElementSelector = '#threads > .thread';
          break;
        default:
          return;
      }

      if (highlightedElement) {
        unhighlight(highlightedElement);
      } else {
        if (lastSelected && isVisible(lastSelected)) {
          highlight(lastSelected);
        } else {
          highlight(getFirstVisibleOrClosest(highlightedElementSelector));
        }
      }

    }
  },
  openSelected: {
    name: 'Open selected',
    fn: () => {
      let mediaBox = $('.highlighted');

      if (!mediaBox) return;
      if (mediaBox.matches('video.expandedWebm')) mediaBox = $('.fileThumb', mediaBox.parentElement);

      switch (getPageType()) {
        case 'index': case 'thread': {
          // check deleted image
          if (!mediaBox.href) break;

          // is webm
          if (mediaBox.href.endsWith('.webm')) {
            if (webmExpanded(mediaBox)) {
              $('.collapseWebm a', mediaBox.parentElement).click();
            } else {
              $('img', mediaBox).click();
              const video = mediaBox.nextElementSibling;
              video.addEventListener('loadedmetadata', e => {
                // only highlight if video still selected
                if (e.target.parentElement && e.target.classList.contains('highlighted')) {
                  highlight(e.target);
                }
              }, {once: true});
            }
          } else {
            click('img:last-of-type', mediaBox);
            const fullImg = $('img.expanded-thumb', mediaBox);
            if (fullImg) {
              onloadstart(fullImg).then(fullImg => {
                // only highlight if image still selected
                if (fullImg.parentElement.classList.contains('highlighted')) {
                  highlight(fullImg.parentElement);
                }
              });
            }
          }
          highlight(mediaBox);
          break;
        }
        case 'catalog': {
          const thumb = $('.thumb', mediaBox);
          if (thumb) thumb.click();
          break;
        }
      }
    }
  },
  openInNewTab: {
    name: 'Open selected in new tab',
    fn: () => {
      const mediaBox = $('.highlighted');
      if (!mediaBox) return;

      switch (getPageType()) {
        case 'index': case 'thread': {
          window.open($('.fileText > a', mediaBox.parentElement).href, '_blank');
          break;
        }
        case 'catalog': {
          const thumb = $('.thumb', mediaBox);
          if (thumb) window.open(thumb.parentElement.href, '_blank');
          break;
        }
      }
    }
  },
  openInBackground: {
    name: 'Open selected in background tab',
    fn: () => {
      const mediaBox = $('.highlighted');
      if (!mediaBox) return;

      switch (getPageType()) {
        case 'index': case 'thread': {
          GM_openInTab($('.fileText > a', mediaBox.parentElement).href, {active: false});
          break;
        }
        case 'catalog': {
          const thumb = $('.thumb', mediaBox);
          if (thumb) GM_openInTab(thumb.parentElement.href, {active: false});
          break;
        }
      }
    }
  },
  prev: {
    name: 'Previous page',
    fn: () => click('.pageSwitcherForm input[accesskey="z"]')
  },
  next: {
    name: 'Next page',
    fn: () => click('.pageSwitcherForm input[accesskey="x"]')
  },
  toPost: {
    name: 'Go to selected post',
    fn: () => {
      const thumb = $('a.highlighted, video.highlighted');  // exclude catalog
      if (thumb) click('.postNum a:first-child', thumb.closest('.post'));
    }
  },
  toIndex: {
    name: 'Go to index',
    fn: () => {
      const boardId = getBoardId();
      if (boardId) window.location.href = `/${boardId}/`;
    }
  },
  toCatelog: {
    name: 'Go to catalog',
    fn: () => {
      const boardId = getBoardId();
      if (boardId && getPageType() !== 'catalog') window.location.href = `/${boardId}/catalog`;
    }
  },
  toggleSound: {
    name: 'Mute/unmute webms',
    fn: () => {
      const video = $('video.highlighted');
      if (!video) return;
      video.muted = !video.muted;
    }
  },
  toggleVideo: {
    name: 'Play/pause webms',
    fn: () => {
      const video = $('video.highlighted');
      if (!video) return;
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  },
  focusSearch: {
    name: 'Focus on search field',
    fn: () => {
      click('#qf-ctrl');
    }
  },
  threadUpdate: {
    name: 'Update thread',
    fn: () => click('a[data-cmd="update"], a#refresh-btn')
  },
  historyBack: {
    name: 'Go back in browser history',
    fn: () => window.history.back()
  },
  historyForward: {
    name: 'Go forward in browser history',
    fn: () => window.history.forward()
  },
  useDefault: {
    name: 'Global: Switch to default keybinds',
    fn: () => switchPreset('default'),
    global: true
  },
  usePreset_1: {
    name: 'Global: Switch to preset 1',
    fn: () => switchPreset('preset_1'),
    global: true
  },
  usePreset_2: {
    name: 'Global: Switch to preset 2',
    fn: () => switchPreset('preset_2'),
    global: true
  },
  usePreset_3: {
    name: 'Global: Switch to preset 3',
    fn: () => switchPreset('preset_3'),
    global: true
  },
  unfocus: {
    fn: event => {
      const target = event.target;
      let stopPropagation = true;

      if (target.matches('#qrForm textarea')) {
        // exceptions
        stopPropagation = false;
      } else if (target.matches('#qf-box')) {
        // first time pressing Esc on the search field blurs it
        target.blur();
      } else {
        if (getPageType() == 'catalog') {
          // pressing Esc while search is active but unfocused clears it
          const filterField = $('#qf-cnt');
          if (window.getComputedStyle(filterField)['display'] == 'inline') {
            $('#qf-box').value = '';
            click('#qf-clear');
          }
        }
        // default behavior
        target.blur();
      }
      return {stopPropagation};
    },
    input: true
  },
  toggleSettings: {
    fn: () => {
      const panel = $(`#${SCRIPT_ID}--panelWrapper`);
      if (panel) {
        panel.remove();
      } else {
        openSettings();
      }
    }
  }
};

const smoothscroll = (function () {
  let startTime = null;
  let pendingFrame = null;
  let keydown = {up: false, down: false, left: false, right: false};

  function reset() {
    startTime = null;
    keydown = {up: false, down: false, left: false, right: false};
    unsafeWindow.cancelAnimationFrame(pendingFrame);
  }
  function noKeyDown() {
    return !(keydown.up || keydown.down || keydown.left || keydown.right);
  }
  function step(timestamp) {

    if (noKeyDown() || !document.hasFocus()) {
      reset();
      return;
    }

    startTime = startTime || timestamp;
    const elapsed = timestamp - startTime;
    const maxVelocity = 40; // px/frame
    const easeDuration = 250;  // ms
    const scale = window.devicePixelRatio;

    const velocity = ((elapsed > easeDuration)
      ? maxVelocity
      : maxVelocity * (elapsed / easeDuration)
    ) / scale;

    let x = 0;
    let y = 0;

    if (keydown.up) y += 1;
    if (keydown.down) y += -1;
    if (keydown.left) x += -1;
    if (keydown.right) x += 1;

    const rad = Math.atan2(y, x);
    x = (x != 0) ? Math.cos(rad) : 0;
    y = Math.sin(rad) * -1;

    const direction = (keydown.up && !keydown.down) ? 'up'
      : (!keydown.up && keydown.down) ? 'down'
      : null;

    if (preventKeyboardNav($('.highlighted'), direction)) {
      window.scrollBy(Math.round(x * velocity), Math.round(y * velocity));
    }

    pendingFrame = window.requestAnimationFrame(step);
  }

  return {
    scroll: function (direction, type) {
      switch (type) {
        case 'keydown':
          if (noKeyDown()) pendingFrame = window.requestAnimationFrame(step);
          keydown[direction] = true;
          break;
        case 'keyup':
          keydown[direction] = false;
          if (noKeyDown()) reset();
          break;
      }
    },
    scrolling: () => !noKeyDown(),
    reset: dir => {
      if (!dir) {
        reset();
      } else {
        keydown[dir] = false;
      }
    }
  };
})();

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

function click(selector, parent = document) {
  const el = $(selector, parent);
  if (el) el.click();
}

function getStorage(key) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  return store[key];
}

function setStorage(key, val) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  store[key] = val;
  localStorage.setItem(SCRIPT_ID, JSON.stringify(store));
}

function getRect(ele) {
  const {top, bottom, height} = ele.getBoundingClientRect();
  const mid = (top + bottom) / 2;

  return {top, bottom, height, mid};
}

function isVisible(ele) {
  const clientHeight = document.documentElement.clientHeight;
  const {top, bottom, height, mid} = getRect(ele);
  const margin = Math.min(Math.max(50, height / 4), clientHeight / 4);

  return (mid > 0 + margin && mid < clientHeight - margin
    || top < 0 + margin && bottom > clientHeight - margin);
}

function getFirstVisibleOrClosest(selector) {
  const nodeList = $$(selector);
  const listLength = nodeList.length;
  const viewportMid = document.documentElement.clientHeight / 2;
  if (listLength < 1) return;

  let closest = nodeList[0];
  let closest_delta = Math.abs(getRect(closest).mid - viewportMid);

  for (let i = 0; i < listLength; i++) {
    const ele = nodeList[i];
    if (ele.closest('#quote-preview')) continue;  // skip quote preview
    if (isVisible(ele)) return ele;

    const ele_y = getRect(ele).mid;
    const ele_delta = Math.abs(ele_y - viewportMid);
    if (ele_delta < closest_delta) {
      [closest, closest_delta] = [ele, ele_delta];
    }
  }
  return closest;
}

function getPageType() {
  const classList = document.body.classList;
  if (classList.contains('is_index') || classList.contains('is_search')) return 'index';
  if (classList.contains('is_thread')) return 'thread';
  if (classList.contains('is_catalog')) return 'catalog';
}

function getBoardId() {
  const regexpPattern = new RegExp('^https?://boards\\.(?:4chan|4channel)\\.org/(\\w+)/');
  const regexpCapture = window.location.href.match(regexpPattern);
  return (regexpCapture) ? regexpCapture[1] : null;
}

function webmExpanded(fileThumb) {
  return (fileThumb.nextElementSibling && fileThumb.nextElementSibling.matches('video.expandedWebm'));
}

function getWebm(ele) {
  return $('video.expandedWebm', ele.parentElement);
}

function highlight(ele, setSmooth = true) {
  if (!ele) return;

  unhighlight($('.highlighted'));

  const anchor = (getPageType() == 'catalog') ? $('.thread > a', ele) : $('.fileText > a', ele.parentElement);
  anchor.focus({preventScroll: true});

  if (webmExpanded(ele)) ele = getWebm(ele);
  ele.classList.add('highlighted');

  if (!isVisible(ele)) {
    const viewportHeight = document.documentElement.clientHeight;
    const eleHeight = ele.getBoundingClientRect().height;
    const padding = viewportHeight * 0.01 * 2;
    const behavior = (setSmooth) ? 'smooth' : 'auto';
    const block = (setSmooth && eleHeight + padding * 2 < viewportHeight)
      ? 'center'
      : 'nearest';

    ele.scrollIntoView({behavior, block});
  }

  lastSelected = ele;
}

function unhighlight(ele) {
  if (!ele) return;
  ele.classList.remove('highlighted');
  document.activeElement.blur();
}

function preventKeyboardNav(selected, direction) {
  if (!selected || !direction) return true;

  const fullImg = $('.expanded-thumb', selected) || $('video.highlighted');
  if (!fullImg || !isVisible(fullImg)) return false;

  const {top, bottom, height} = getRect(fullImg);
  const clientHeight = document.documentElement.clientHeight;
  const margin = clientHeight * 0.01;

  return (height > clientHeight
    && ((direction == 'up' && top - margin < 0)
      || (direction == 'down' && bottom + margin > clientHeight)));
}

function scroll(direction, event) {
  const {type, repeat} = event;
  const selected = $('.highlighted');

  if (preventKeyboardNav(selected, direction) && !repeat) {
    smoothscroll.scroll(direction, type);
  } else if (type == 'keydown' && !smoothscroll.scrolling()) {
    keyboardNav(direction, selected, !repeat);
  } else if (type == 'keyup') {
    smoothscroll.reset(direction);
  }
}

function keyboardNav(direction, mediaBox, setSmooth) {
  function similar(val1, val2, margin) {
    return (val1 < val2 + margin && val1 > val2 - margin);
  }
  let ele = mediaBox;
  if (ele.matches('video.expandedWebm')) {
    ele = $('.fileThumb', ele.parentElement);
  }


  if (getPageType() == 'catalog') {
    // catalog
    const originalPos = {x: mediaBox.offsetLeft, y: mediaBox.offsetTop};
    const boxWidth = mediaBox.clientWidth;
    const errorMargin = boxWidth / 1.8;
    const selector = '.thread';

    switch (direction) {
      case 'left': {
        if (mediaBox.previousElementSibling.matches(selector)) {
          ele = mediaBox.previousElementSibling;
        }
        break;
      }
      case 'right': {
        if (mediaBox.nextElementSibling.matches(selector)) {
          ele = mediaBox.nextElementSibling;
        }
        break;
      }
      case 'up': {
        let currentBox = mediaBox;
        do {
          const currentPos = {x: currentBox.offsetLeft, y: currentBox.offsetTop};
          if (!similar(originalPos.y, currentPos.y, errorMargin)) ele = currentBox;
          if (currentPos.y < originalPos.y && similar(originalPos.x, currentPos.x, errorMargin)) break;
        } while (
          (currentBox = currentBox.previousElementSibling)
          && currentBox.matches(selector)
        );
        break;
      }
      case 'down': {
        let currentBox = mediaBox;
        let currentRow = currentBox.offsetTop;
        do {
          const currentPos = {x: currentBox.offsetLeft, y: currentBox.offsetTop};
          if (!similar(originalPos.y, currentPos.y, errorMargin)) ele = currentBox;
          if ((currentPos.y > originalPos.y && similar(originalPos.x, currentPos.x, errorMargin))) break;
          if (currentPos.y > currentRow) {
            // first element of new row
            currentRow = currentPos.y;
            if (currentPos.x > originalPos.x) break;
          }
        } while (
          (currentBox = currentBox.nextElementSibling)
          && currentBox.matches(selector)
        );
        break;
      }
    }
  } else {
    // index or thread
    const selector = 'a.fileThumb';
    const nodeList = $$(selector);
    const position = [...nodeList].indexOf(ele);

    switch (direction) {
      case 'up': case 'left': {
        if (position > 0) ele = nodeList.item(position - 1);
        break;
      }
      case 'down': case 'right': {
        if (position < nodeList.length - 1) ele = nodeList.item(position + 1);
        break;
      }
    }
  }
  highlight(ele, setSmooth);
}

function onloadstart(img) {
  const interval = 100;
  let timeout;

  function loadCheck(img, resolveFn) {
    if (img.naturalWidth) {
      resolveFn(img);
    } else {
      timeout = window.setTimeout(loadCheck, interval, img, resolveFn);
    }
  }

  return (img.complete) ? Promise.resolve(img) : new Promise((resolve, reject) => {
    img.addEventListener('error', () => {
      window.clearTimeout(timeout);
      reject();
    }, {once: true});
    timeout = window.setTimeout(loadCheck, interval, img, resolve);
  });
}

function switchPreset(id) {
  const selector = $(`#${SCRIPT_ID}--preset-selector`);
  if (selector) {
    selector.value = id;
    selector.dispatchEvent(new Event('input'));
  } else {
    setStorage('usePreset', id);
  }
}

function getActiveKeybinds() {
  const keybinds = getStorage('keybinds');
  const id = getStorage('usePreset');
  return keybinds[id];
}

function getGlobalKeybinds() {
  const keybinds = getStorage('keybinds');
  return keybinds['global'];
}

/*
 *  Returns false if no match found, otherwise returns the bind settings
 */
function matchKeybind(key, ctrl, alt, shift) {
  const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds(), ...presets.reserved};
  for (const name in keybinds) {
    for (const slot of keybinds[name]) {
      if (slot === null || slot === undefined) continue;
      const {
        key: bindKey,
        ctrl: bindCtrl = false,
        alt: bindAlt = false,
        shift: bindShift = false
      } = slot;

      if (key == bindKey
        && ctrl == bindCtrl
        && alt == bindAlt
        && shift == bindShift
        && Object.prototype.hasOwnProperty.call(actions, name)
      ) {
        return name;
      }
    }
  }
  return false;
}

function openSettings() {
  function rowTemplate(name, id) {
    return `
<span>${name}</span>
<input data-command="${id}" data-slot="0" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
<input data-command="${id}" data-slot="1" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
`;
  }
  function printRows() {
    const arr = [];

    for (const id in actions) {
      if (actions[id].name) arr.push(rowTemplate(actions[id].name, id));
    }

    return arr.join('');
  }
  function clear(input) {
    input.value = '';
    input.dataset.key = '';
    input.ctrl = false;
    input.alt = false;
    input.shift = false;
  }
  function renderSingleKeybind(input) {
    function simplify(str) {
      return str.replace(/^(Key|Digit)/, '');
    }
    const keyCombinations = [];
    if (input.ctrl) keyCombinations.push('Ctrl');
    if (input.alt) keyCombinations.push('Alt');
    if (input.shift) keyCombinations.push('Shift');
    if (input.dataset.key !== '') keyCombinations.push(simplify(input.dataset.key));
    input.value = keyCombinations.join('+');
  }
  function renderAllKeybinds(wrapper) {
    const panelWrapper = wrapper || document.getElementById(`${SCRIPT_ID}--panelWrapper`);
    const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds()};

    if (!panelWrapper) return;

    // Reset input fields
    for (const input of $$('[data-command]', panelWrapper)) {
      clear(input);
      input.disabled = (getStorage('usePreset') == 'default');
    }

    // Populate input from storage
    for (const name in keybinds) {
      const slots = keybinds[name];
      for (let i = 0; i < slots.length; i++) {
        const input = $(` [data-command="${name}"][data-slot="${i}"]`, panelWrapper);

        if (!slots[i] || !input || !slots[i].key) continue;

        const {key, ctrl = false, alt = false, shift = false} = slots[i];
        input.dataset.key = key;
        input.ctrl = ctrl;
        input.alt = alt;
        input.shift = shift;
        renderSingleKeybind(input);
      }
    }
  }
  function modifierLookup(which) {
    return ({16: 'shift', 17: 'ctrl', 18: 'alt'}[which]);
  }
  function saveKeybind(input) {
    const key = input.dataset.key;
    const ctrl = input.ctrl;
    const alt = input.alt;
    const shift = input.shift;
    const command = input.dataset.command;
    const slot = parseInt(input.dataset.slot);

    if (matchKeybind(key, ctrl, alt, shift)) {
      // existing keybind
      clear(input);
      input.blur();
      input.value = 'Keybind already in use';
      return;
    }
    if (reservedKeys.includes(key)) {
      // reserved key
      clear(input);
      input.blur();
      input.value = 'Key is reserved';
      return;
    }

    const presets = getStorage('keybinds');
    const keybinds = (actions[command].global)
      ? presets['global']
      : presets[getStorage('usePreset')];

    if (!keybinds[command]) {
      keybinds[command] = [];
    }
    if (key !== '') {
      // set
      keybinds[command][slot] = {key, ctrl, alt, shift};
      input.blur();
    } else {
      // delete
      delete keybinds[command][slot];
      if (keybinds[command].every(val => val === null)) delete keybinds[command];
    }
    setStorage('keybinds', presets);
    renderSingleKeybind(input);
  }
  function keydownHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.code == 'Escape' || e.code == 'Backspace' || e.code == 'Delete') {
      clear(input);
      saveKeybind(input);
      return;
    }

    if (e.repeat || input.dataset.key !== '') {
      return;
    }

    if (e.which >= 16 && e.which <= 18) {
      input[modifierLookup(e.which)] = true;
      renderSingleKeybind(input);
      return;
    }

    input.dataset.key = e.code;
    saveKeybind(input);
  }
  function keyupHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.which >= 16 && e.which <= 18 && !e.repeat && input.dataset.key == '') {
      input[modifierLookup(e.which)] = false;
      renderSingleKeybind(input);
    }
  }
  const panelWrapper = document.createElement('div');
  panelWrapper.id = `${SCRIPT_ID}--panelWrapper`;
  panelWrapper.innerHTML = `
<div id="${SCRIPT_ID}--panel" class="reply">
  <div class="${SCRIPT_ID}--header panelHeader">
    <b>Custom Shortcuts Settings</b>
    <select id="${SCRIPT_ID}--preset-selector">
      <option value="default">Default</option>
      <option value="preset_1">Preset 1</option>
      <option value="preset_2">Preset 2</option>
      <option value="preset_3">Preset 3</option>
    </select>
    <button id="${SCRIPT_ID}--close-button" class="button">🗙</button>
  </div>
  <div class="${SCRIPT_ID}--body">
    Esc/Backspace/Del to clear setting
    <br>
    <br>
    <div class="${SCRIPT_ID}--table">
      <span><b>Action</b></span>
      <span><b>Slot 1</b></span>
      <span><b>Slot 2</b></span>
      ${printRows()}
    </div>
  </div>
</div>
`;

  for (const input of $$('[data-command]', panelWrapper)) {
    // event handlers
    input.addEventListener('keydown', keydownHandler);
    input.addEventListener('keyup', keyupHandler);

    // define getter and setters
    for (const modifier of ['ctrl', 'alt', 'shift']) {
      Object.defineProperty(input, modifier, {
        set: function (val) {
          this.dataset[modifier] = val ? '1' : '0';
        },
        get: function () {
          return (this.dataset[modifier] == '1');
        }
      });
    }
  }

  // selector
  const selector = $(`#${SCRIPT_ID}--preset-selector`, panelWrapper);
  selector.value = getStorage('usePreset');
  selector.addEventListener('input', () => {
    setStorage('usePreset', selector.value);
    selector.blur();
    renderAllKeybinds();
  });

  // close panel
  panelWrapper.addEventListener('click', e => {
    if (e.target == e.currentTarget ||
      e.target.matches(`#${SCRIPT_ID}--close-button`)) {
      panelWrapper.remove();
    }
  });

  renderAllKeybinds(panelWrapper);
  document.body.appendChild(panelWrapper);
}

function keyHandler(e) {
  const command = matchKeybind(e.code, e.ctrlKey, e.altKey, e.shiftKey);
  const ownSettingsSelector = `.${SCRIPT_ID}--table input, #${SCRIPT_ID}--preset-selector`;
  let stopPropagation = false;
  let preventDefault = false;

  if (command) {
    stopPropagation = true;
    preventDefault = true;
  }

  // By default not to run on site inputs
  if (e.target.matches('input, textarea') || e.target.matches(ownSettingsSelector)) {
    stopPropagation = false;
    preventDefault = false;
  }

  if (command
    && (actions[command].constant || (e.type == 'keydown'))
    && (actions[command].repeat || !e.repeat)
    && (actions[command].input || !e.target.matches('input, textarea'))
    && !e.target.matches(ownSettingsSelector)) {

    const o = actions[command].fn(e) || {};
    if (Object.prototype.hasOwnProperty.call(o, 'stopPropagation')) stopPropagation = o.stopPropagation;
    if (Object.prototype.hasOwnProperty.call(o, 'preventDefault')) preventDefault = o.preventDefault;

  }

  if (stopPropagation) e.stopPropagation();
  if (preventDefault) e.preventDefault();
}

function init() {
  GM_addStyle(CSS);

  // Initialize localStorage on first run
  if (localStorage.getItem(SCRIPT_ID) == null) localStorage.setItem(SCRIPT_ID, '{}');
  if (getStorage('keybinds') == null) setStorage('keybinds', {
    default: presets.default,
    preset_1: presets.preset_1,
    preset_2: presets.preset_2,
    preset_3: presets.preset_3,
    global: presets.global
  });
  if (getStorage('usePreset') == null) setStorage('usePreset', 'preset_1');

  // 'capture' is set to true so that the event is dispatched to handler
  // before the native ones, so that the site shortcuts can be disabled
  // by stopPropagation();
  document.addEventListener('keydown', keyHandler, {capture: true});
  document.addEventListener('keyup', keyHandler, {capture: true});

  // Disable highlight when navigating away from current page.
  // Workaround for Firefox preserving page state when moving forward
  // and back in history.
  window.addEventListener('pagehide', function () {
    unhighlight($('.highlighted'));
  });
}

init();
})();
