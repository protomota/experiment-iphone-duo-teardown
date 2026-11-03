// Everything outside the canvas. sync(state) redraws from the model; no panel keeps a number of its own.
import * as M from './model.js';
import {SOURCES} from './sources.js';

const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const COLUMN_INSET = 18;
const TAG_R = 12;
const TAG_GAP = 29;
const WIDE = 920;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const svgNode = (tag, attrs = {}, parent = null) => {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  parent?.append(node);
  return node;
};
const sourceLink = (key) => {
  const {label, url} = SOURCES[key];
  const link = element('a', '', label);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
};
const factRow = ({k, v, s, note}) => {
  const row = element('div', 'fact');
  row.append(element('dt', '', k));
  const source = element('dd', 'source');
  source.append(sourceLink(s));
  row.append(source, element('dd', 'value', v));
  if (note) row.append(element('dd', 'note', note));
  return row;
};

const buildSteps = (onPart, onChapter) => {
  const nav = $('steps');
  const buttons = {};
  const groups = {};
  for (const chapter of M.CHAPTERS.slice(1)) {
    const parts = M.PARTS.filter((item) => item.chapter === chapter.id);
    const group = element('div', 'group');
    const heading = element('h2');
    const toggle = element('button', 'chapter-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.append(element('span', '', chapter.name), element('span', 'count', parts.length));
    toggle.addEventListener('click', () => onChapter(chapter.id));
    heading.append(toggle);
    const list = element('div', 'group-inner');
    const fold = element('div', 'group-steps');
    fold.append(list);
    group.append(heading, fold);
    groups[chapter.id] = {group, toggle};
    for (const part of parts) {
      const button = element('button', 'step');
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.append(element('span', 'n', part.n), element('span', '', part.name));
      button.addEventListener('click', () => onPart(part.id));
      buttons[part.id] = button;
      list.append(button);
    }
    nav.append(group);
  }
  return {buttons, groups};
};

const buildViews = (onView) => {
  const buttons = {};
  for (const [id, view] of Object.entries(M.VIEWS)) {
    const button = element('button', '', view.name);
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => onView(id));
    buttons[id] = button;
    $('views').append(button);
  }
  return buttons;
};

const buildTicks = () => {
  const startOf = (chapter) => {
    const first = M.PARTS.find((part) => part.chapter === chapter?.id);
    return first ? M.WINDOW[first.id][0] : chapter ? 0 : 1;
  };
  return M.CHAPTERS.map((chapter, i) => {
    const span = element('span', '', chapter.short);
    const start = startOf(chapter);
    span.style.left = `${start * 100}%`;
    span.style.width = `${(startOf(M.CHAPTERS[i + 1]) - start) * 100}%`;
    $('ticks').append(span);
    return span;
  });
};

const buildNotes = () => {
  for (const fact of M.FACTS) $('specs').append(factRow(fact));
  for (const item of M.UNSOURCED) $('unsourced').append(element('li', '', item));
  for (const key of Object.keys(SOURCES)) {
    const item = element('li');
    item.append(sourceLink(key));
    $('sources').append(item);
  }
};

const renderDetail = (part) => {
  const detail = $('detail');
  detail.replaceChildren();
  if (part.n) detail.append(element('p', 'partno', `Part ${part.n} of ${M.PARTS.length}`));
  detail.append(element('h2', '', part.name), element('p', 'does', part.does));
  if (!part.facts.length) return;
  const facts = element('dl', 'facts');
  facts.append(...part.facts.map(factRow));
  detail.append(facts);
};

const pieceButton = (piece, onPiece, lines) => {
  const button = element('button', 'piece');
  button.type = 'button';
  button.dataset.piece = piece.id;
  button.setAttribute('aria-pressed', 'false');
  button.append(element('span', 'piece-tag', piece.kind === 'screw' ? piece.id : piece.tag), ...lines);
  button.addEventListener('click', () => onPiece(piece.id));
  return button;
};
const screwRow = (screw, onPiece) => pieceButton(screw, onPiece, [
  element('span', 'piece-name', M.HEADS[screw.head]),
  element('span', 'piece-role', `${screw.part}, ${screw.torque}`),
]);
const chipRow = (chip, onPiece) => pieceButton(chip, onPiece, [element('span', 'piece-name', chip.name), element('span', 'piece-role', chip.role)]);

const pieceList = (title, source, rows) => {
  const section = element('section', 'pieces');
  const heading = element('div', 'pieces-head');
  heading.append(element('h3', '', `${title}, ${rows.length}`), sourceLink(source));
  section.append(heading, ...rows);
  return section;
};

/** Every screw and chip on a part, each one a button. */
const renderPieces = (id, onPiece) => {
  const box = $('pieces');
  box.replaceChildren();
  const screws = M.SCREWS_OF[id] ?? [];
  const chips = M.CHIPS_ON[id] ?? [];
  if (screws.length) box.append(pieceList('Screws', 'appleScrews', screws.map((screw) => screwRow(screw, onPiece))));
  for (const [side, title] of [['front', 'Chips on the front'], ['back', 'Chips on the back']]) {
    const rows = chips.filter((chip) => chip.side === side).map((chip) => chipRow(chip, onPiece));
    if (rows.length) box.append(pieceList(title, 'ifixitChips', rows));
  }
};

/** Stacks tags along a stage edge, keeping their order and at least TAG_GAP apart. */
const spread = (tags, top, bottom) => {
  tags.sort((a, b) => a.y - b.y);
  for (let i = 1; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, tags[i - 1].y + TAG_GAP);
  let limit = bottom;
  for (let i = tags.length - 1; i >= 0; i--) {
    tags[i].y = Math.min(tags[i].y, limit);
    limit = tags[i].y - TAG_GAP;
  }
  if (tags.length && tags[0].y < top) {
    tags[0].y = top;
    for (let i = 1; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, tags[i - 1].y + TAG_GAP);
  }
};

const createLeaders = (onPart) => {
  const svg = $('leaders');
  const pool = M.PARTS.map(() => {
    const group = svgNode('g', {}, svg);
    const parts = {
      group,
      line: svgNode('line', {}, group),
      anchor: svgNode('circle', {class: 'anchor', r: 2.5}, group),
      tag: svgNode('circle', {class: 'tag', r: TAG_R}, group),
      label: svgNode('text', {}, group),
      name: svgNode('text', {class: 'name'}, group),
    };
    parts.tag.addEventListener('click', () => onPart(parts.id));
    return parts;
  });
  return (callouts, project, w, h) => {
    const wide = w >= 560;
    const shown = wide ? callouts : callouts.filter((callout) => callout.active);
    const placed = shown.map((callout) => {
      const [x, y] = project(callout.at);
      return {...callout, x, y};
    }).filter(({x, y}) => x > 0 && x < w && y > 0 && y < h);
    const top = 16;
    const bottom = h - 16;
    for (const side of ['left', 'right']) spread(placed.filter((tag) => tag.side === side), top, bottom);
    pool.forEach((slot, i) => {
      const tag = placed[i];
      if (!tag) {
        slot.group.style.display = 'none';
        return;
      }
      const [ax, ay] = project(tag.at);
      const x = tag.side === 'left' ? COLUMN_INSET : w - COLUMN_INSET;
      slot.id = tag.id;
      slot.group.style.display = '';
      slot.group.setAttribute('class', tag.active ? 'active' : '');
      const inward = tag.side === 'left' ? 1 : -1;
      slot.line.setAttribute('x1', x + inward * TAG_R);
      slot.line.setAttribute('y1', tag.y);
      slot.line.setAttribute('x2', ax);
      slot.line.setAttribute('y2', ay);
      slot.anchor.setAttribute('cx', ax);
      slot.anchor.setAttribute('cy', ay);
      slot.tag.setAttribute('cx', x);
      slot.tag.setAttribute('cy', tag.y);
      slot.label.setAttribute('x', x);
      slot.label.setAttribute('y', tag.y);
      slot.label.textContent = tag.n;
      slot.name.textContent = tag.active && wide ? tag.name : '';
      slot.name.setAttribute('class', tag.side === 'left' ? 'name' : 'name end');
      slot.name.setAttribute('x', x + inward * (TAG_R + 6));
      slot.name.setAttribute('y', tag.y - TAG_R - 4);
    });
  };
};

const PLAY_ICON = 'M2 1 11 6 2 11Z';
const PAUSE_ICON = 'M2 1H5V11H2ZM7 1H10V11H7Z';

const buildPlay = (onPlay) => {
  const button = $('play');
  const svg = svgNode('svg', {viewBox: '0 0 12 12', 'aria-hidden': 'true'}, button);
  const icon = svgNode('path', {}, svg);
  const label = element('span');
  button.append(label);
  button.addEventListener('click', onPlay);
  return (playing) => {
    icon.setAttribute('d', playing ? PAUSE_ICON : PLAY_ICON);
    label.textContent = playing ? 'Pause' : 'Play';
  };
};

export function createUI({onPart, onPiece, onView, onSlide, onPlay, onRestart}) {
  let pinned = null;
  let openChapter = null;
  let currentChapter = null;
  const openGroup = (id) => {
    if (id === openChapter) return;
    openChapter = id;
    for (const [chapter, {group, toggle}] of Object.entries(groups)) {
      group.classList.toggle('open', chapter === id);
      toggle.setAttribute('aria-expanded', chapter === id);
    }
  };
  const {buttons: steps, groups} = buildSteps(onPart, (id) => {
    pinned = pinned === id ? null : id;
    openGroup(pinned ?? currentChapter);
  });
  const views = buildViews(onView);
  const ticks = buildTicks();
  buildNotes();
  const drawLeaders = createLeaders(onPart);

  const slider = $('progress');
  slider.addEventListener('input', () => onSlide(Number(slider.value)));
  const showPlaying = buildPlay(onPlay);
  $('restart').addEventListener('click', onRestart);

  let shownId = null;
  let shownPick = null;
  let activeStep = null;
  let readoutKey = '';
  let playing = null;
  const chapterLink = $('chapter');

  const syncPlay = (touring) => {
    if (touring === playing) return;
    playing = touring;
    showPlaying(touring);
  };

  /** current: the one part the panels are about. Everything that names a part reads it, so they change together. */
  const syncReadout = (p, read, current) => {
    const key = `${current.id}|${Math.round(read.angle)}|${read.out}|${read.screws}|${read.size?.k ?? ''}`;
    if (key === readoutKey) return;
    readoutKey = key;
    const box = $('readout');
    box.replaceChildren();
    const size = read.size ? `${read.size.k}: ${read.size.v}` : `Opening ${Math.round(read.angle)}°`;
    box.append(element('strong', '', current.n ? `Step ${current.n} of ${read.total}: ${current.name}` : M.SEALED.name));
    box.append(element('span', 'num', size), element('span', 'num wide', `${read.out} of ${read.total} parts, ${read.screws} of ${M.COUNTS.screws} screws out`));
    const chapterIndex = M.CHAPTERS.findIndex(({id}) => id === current.chapter);
    const chapter = M.CHAPTERS[chapterIndex];
    chapterLink.replaceChildren(element('span', 'chapter-name', `${chapter.name}, `), `iFixit video at ${chapter.time}`);
    const [minutes, seconds] = chapter.time.split(':').map(Number);
    chapterLink.href = `${SOURCES.ifixitVideo.url}&t=${minutes * 60 + seconds}s`;
    ticks.forEach((tick, i) => tick.classList.toggle('current', i === chapterIndex));
    for (const part of M.PARTS) {
      const button = steps[part.id];
      button.classList.toggle('active', part.id === current.id);
      button.classList.toggle('out', M.partK(part.id, p) >= 1);
    }
    followChapter(M.CHAPTERS[Math.max(chapterIndex, 1)].id);
    centerStep(steps[current.id] ?? steps[M.PARTS[0].id]);
  };

  /** The open chapter follows the phone, until the visitor opens another one by hand. */
  const followChapter = (id) => {
    if (id === currentChapter) return;
    currentChapter = id;
    pinned = null;
    openGroup(id);
  };

  /** On a phone the parts are one long row, so the active one slides to the middle of it. */
  const centerStep = (button) => {
    if (!button || button === activeStep || innerWidth >= WIDE) return;
    activeStep = button;
    const nav = $('steps');
    nav.scrollTo({left: button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2, behavior: calm ? 'auto' : 'smooth'});
  };

  const syncPick = (pick) => {
    if (pick === shownPick) return;
    shownPick = pick;
    const sheet = $('sheet');
    for (const button of $('pieces').querySelectorAll('.piece')) {
      const pressed = button.dataset.piece === pick;
      button.setAttribute('aria-pressed', pressed);
      // on a phone the sheet is part of the page, and the tour must not scroll the page
      if (pressed && innerWidth >= WIDE) sheet.scrollTop = button.offsetTop - sheet.clientHeight / 3;
    }
  };

  /** state: {p, focus, iso, view, touring, pick, selected}, plus the stage to place the leaders with. */
  const sync = ({p, focus, iso, view, touring, pick = null, selected = null}, stage) => {
    const read = M.readout(p);
    // while the phone travels to a chosen part, the parts it passes are not selected: the chosen one is
    const current = selected ? M.PART[selected] ?? M.SEALED : read.part;
    if (document.activeElement !== slider || touring) slider.value = p;
    slider.style.setProperty('--done', `${p * 100}%`);
    syncReadout(p, read, current);
    syncPlay(touring);
    if (current.id !== shownId) {
      shownId = current.id;
      shownPick = null;
      renderDetail(current);
      renderPieces(current.id, onPiece);
      $('sheet').scrollTop = 0;
    }
    syncPick(pick);
    for (const part of M.PARTS) steps[part.id].setAttribute('aria-pressed', selected === part.id);
    for (const [id, button] of Object.entries(views)) button.setAttribute('aria-pressed', id === view);
    const {w, h} = stage.size;
    drawLeaders(M.calloutsAt(p, focus && iso > 0.5 ? focus : null, view, pick), stage.project, w, h);
  };

  renderDetail(M.SEALED);
  shownId = M.SEALED.id;
  followChapter(M.CHAPTERS[1].id);

  const show = (id) => {
    renderDetail(M.PART[id]);
    renderPieces(id, () => {});
  };
  return {sync, show};
}
