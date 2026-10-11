#!/usr/bin/env node
/**
 * Contrast check of the color tokens in src/index.css (light @theme and .dark).
 *
 * Checks the text/background pairs from the usage rules in DESIGN.md and
 * prints every pair below its minimum (4.5:1 text, 3:1 large text and graphics).
 * Exit code 1 when a pair fails.
 *
 *   node scripts/check-contrast.mjs          failures only
 *   node scripts/check-contrast.mjs --all    every pair with its ratio
 *
 * Not part of the build.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CSS_PATH = fileURLToPath(new URL('../src/index.css', import.meta.url))
const TEXT = 4.5
const GRAPHIC = 3

// ── Token parsing ──────────────────────────────────────────────
const readBlock = (css, selector) => {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`Block "${selector}" not found in index.css`)
  const end = css.indexOf('\n}', start)
  const tokens = {}
  for (const [, name, value] of css.slice(start, end).matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value
  }
  return tokens
}

const css = readFileSync(CSS_PATH, 'utf8')
const light = readBlock(css, '@theme')
const schemes = { light, dark: { ...light, ...readBlock(css, '.dark') } }

// ── WCAG 2.x relative luminance and contrast ratio ─────────────
const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** "success-container" or "error/10" (token with opacity, composited over `base`). */
const resolve = (tokens, spec, base) => {
  const [name, alpha] = spec.split('/')
  const hex = tokens[name]
  if (!hex) throw new Error(`Unknown token "${name}"`)
  const rgb = toRgb(hex)
  if (alpha === undefined) return rgb
  const a = Number(alpha) / 100
  const under = resolve(tokens, base, 'surface-container-lowest')
  return rgb.map((c, i) => Math.round(c * a + under[i] * (1 - a)))
}

// ── Pairs from the usage rules ─────────────────────────────────
// [rule, foreground, background, minimum, base under a translucent background]
const SURFACES = ['surface', 'surface-container-lowest', 'surface-container-low']
const STATUSES = ['success', 'warning', 'live', 'error']

const pairs = []
const add = (rule, fg, bg, min, base = 'surface-container-lowest') => pairs.push({ rule, fg, bg, min, base })

// Base text
for (const bg of [...SURFACES, 'surface-container', 'surface-container-high']) {
  add('0 text', 'on-surface', bg, TEXT)
  add('0 text', 'on-surface-variant', bg, TEXT)
}
for (const bg of SURFACES) {
  add('0 text', 'primary', bg, TEXT)
  add('0 icons', 'outline', bg, GRAPHIC)
}

// 1. Status as text on a regular background
for (const bg of SURFACES) {
  for (const s of STATUSES) add('1 status text', `on-${s}-container`, bg, TEXT)
  add('1 status text', 'error', bg, TEXT)
  // success is too light for small text on grey surfaces: text uses on-success-container
  add('1 status icon', 'success', bg, GRAPHIC)
}

// 2. Badges: tinted background + text on the tint (status icons on the tint are graphics)
for (const s of [...STATUSES, 'primary', 'secondary', 'tertiary']) {
  add('2 badge', `on-${s}-container`, `${s}-container`, TEXT)
}
for (const s of STATUSES) add('2 badge icon', s, `${s}-container`, GRAPHIC)
add('2 badge icon', 'primary', 'primary-container', GRAPHIC)
add('2 nav active', 'on-primary-fixed-variant', 'primary-fixed', TEXT)
add('2 nav active', 'primary', 'primary/10', TEXT, 'surface') // sidebar, drawer, bottom bar
add('2 badge', 'on-tertiary-fixed-variant', 'tertiary-fixed', TEXT)
add('2 tint', 'primary', 'primary/10', TEXT)
add('2 hover', 'error', 'error-container', TEXT) // destructive outline button on hover

// 3. Solid fills with text
for (const s of ['success', 'error', 'primary', 'live']) add('3 solid fill', `on-${s}`, s, TEXT)
add('3 solid fill', 'primary-foreground', 'primary', TEXT)

// 4. Graphic fills without text (against the card they sit on and their track)
for (const fill of ['success-soft', 'warning', 'live', 'error', 'primary']) {
  add('4 graphic', fill, 'surface-container-lowest', GRAPHIC)
}
add('4 graphic', 'success-soft', 'surface-container-high', GRAPHIC)

// 5. Midnight card
add('5 midnight', 'midnight-foreground', 'midnight', TEXT)
add('5 midnight', 'midnight-muted', 'midnight', TEXT)
add('5 midnight badge', 'midnight-foreground', 'midnight-foreground/8', TEXT, 'midnight')
add('5 midnight button', 'on-primary', 'primary', TEXT)

// ── Run ────────────────────────────────────────────────────────
const showAll = process.argv.includes('--all')
let failures = 0

for (const [scheme, tokens] of Object.entries(schemes)) {
  console.log(`\n${scheme}`)
  for (const { rule, fg, bg, min, base } of pairs) {
    const value = ratio(resolve(tokens, fg, base), resolve(tokens, bg, base))
    const ok = value >= min
    if (!ok) failures++
    if (showAll || !ok) {
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${value.toFixed(2).padStart(5)}:1 (min ${min})  [${rule}] ${fg} on ${bg}`)
    }
  }
}

console.log(failures ? `\n${failures} pair(s) below the minimum.` : `\nAll ${pairs.length * 2} pairs pass.`)
process.exitCode = failures ? 1 : 0
