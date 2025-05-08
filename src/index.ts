/**
 * @module streaming-text-animator
 * A library to display streaming text with character-by-character fade-in animation.
 */

/**
 * Options for configuring the StreamingTextAnimator.
 */
export interface AnimatorOptions {
  /**
   * The target HTML element or a CSS selector string for the element
   * where text should be displayed.
   */
  target: HTMLElement | string

  /**
   * Delay between each character appearing (in milliseconds).
   * Lower values mean faster typing.
   * @default 35
   */
  charDelay?: number

  /**
   * Duration of the fade-in animation for each character (in seconds).
   * @default 0.4
   */
  animationDuration?: number

  /**
   * CSS class applied to each character's span element.
   * Allows for custom styling beyond the basic fade-in.
   * @default 'streaming-char'
   */
  charClassName?: string

  /**
   * ID used for the injected <style> tag to prevent duplicates.
   * Set to `null` or an empty string to disable automatic CSS injection.
   * @default 'streaming-text-animator-styles'
   */
  styleId?: string | null

  /**
   * Custom CSS keyframes definition for the fade-in animation.
   * If provided, overrides the default fadeInStream animation.
   * Example: `@keyframes myFade { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }`
   * @default Default fadeInStream keyframes
   */
  customKeyframes?: string

  /**
   * The name of the CSS animation to apply (should match the name in customKeyframes if provided).
   * @default 'fadeInStream'
   */
  animationName?: string

  /**
   * Function to create the element wrapper for each character.
   * Defaults to creating a 'span'. Allows customization, e.g., using 'i' or adding attributes.
   * @param char The character being wrapped.
   * @returns The HTMLElement to use as a wrapper.
   * @default (char) => document.createElement('span')
   */
  createElement?: (char: string) => HTMLElement
}

/**
 * Default configuration values for the animator.
 */
const DEFAULT_OPTIONS: Required<Omit<AnimatorOptions, 'target' | 'customKeyframes' | 'createElement'>> = {
  charDelay: 35,
  animationDuration: 0.4,
  charClassName: 'streaming-char',
  styleId: 'streaming-text-animator-styles',
  animationName: 'fadeInStream',
}

/**
 * Manages the streaming text animation for a target HTML element.
 */
export class StreamingTextAnimator {
  private targetElement: HTMLElement
  private options: Required<Omit<AnimatorOptions, 'target' | 'customKeyframes' | 'createElement'>>
  private customKeyframes?: string
  private createElementFn: (char: string) => HTMLElement

  private queue: string[] = []
  private isProcessing: boolean = false
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private injectedStyleElement: HTMLStyleElement | null = null

  /**
   * Creates an instance of StreamingTextAnimator.
   * @param config - Configuration options including the target element.
   */
  constructor(config: AnimatorOptions) {
    const target = typeof config.target === 'string'
      ? document.querySelector<HTMLElement>(config.target)
      : config.target

    if (!target) {
      throw new Error(`StreamingTextAnimator Error: Target element "${config.target}" not found.`)
    }
    this.targetElement = target

    // Merge defaults with provided options
    this.options = { ...DEFAULT_OPTIONS, ...config }
    this.customKeyframes = config.customKeyframes
    this.createElementFn = config.createElement ?? (() => document.createElement('span'))

    if (this.options.styleId) {
      this._injectCSS()
    }
  }

  /**
   * Injects the necessary CSS styles into the document's head.
   * @private
   */
  private _injectCSS(): void {
    if (!this.options.styleId || document.getElementById(this.options.styleId)) {
      return // Don't inject if ID is null/empty or style already exists
    }

    const keyframes = this.customKeyframes || `
      @keyframes ${this.options.animationName} {
        from { opacity: 0; /* transform: translateY(2px); */ }
        to { opacity: 1; /* transform: translateY(0); */ }
      }
    `

    const css = `
      ${keyframes}

      .${this.options.charClassName} {
        opacity: 0;
        display: inline-block;
        animation: ${this.options.animationName} ${this.options.animationDuration}s forwards;
        white-space: pre-wrap; /* Preserve whitespace and allow wrapping */
      }
    `

    const style = document.createElement('style')
    style.id = this.options.styleId
    style.textContent = css
    document.head.appendChild(style)
    this.injectedStyleElement = style // Keep track of the injected style
  }

  /**
   * Adds a chunk of text received from the stream to the processing queue.
   * @param textChunk - The piece of text to add.
   */
  public addChunk(textChunk: string): void {
    this.queue.push(...textChunk.split('')) // Add characters individually
    if (!this.isProcessing) {
      this._processQueue()
    }
  }

  /**
   * Processes the character queue asynchronously.
   * @private
   */
  private _processQueue(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const char = this.queue.shift()! // Non-null assertion ok due to length check

    const element = this.createElementFn(char) // Use the factory function
    element.className = this.options.charClassName

    // Handle special HTML characters and whitespace
    switch (char) {
      case '\n':
        element.innerHTML = '<br>'
        break
      case ' ':
        element.innerHTML = '&nbsp;' // Use non-breaking space for visibility
        // Or use textContent for standard space behavior:
        // element.textContent = ' ';
        break
      case '<':
        element.textContent = '<' // Avoid rendering as HTML tag start
        break
      case '>':
        element.textContent = '>' // Avoid rendering as HTML tag end
        break
      case '&':
        element.textContent = '&' // Avoid rendering as HTML entity start
        break
      default:
        element.textContent = char
    }

    this.targetElement.appendChild(element)

    this.timeoutId = setTimeout(() => {
      this._processQueue()
    }, this.options.charDelay)
  }

  /**
   * Stops any ongoing animation, clears the character queue, and optionally
   * clears the content already displayed in the target element.
   * @param {boolean} [clearContent] - If true, removes all child nodes from the target element.
   */
  public reset(clearContent: boolean = true): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.queue = []
    this.isProcessing = false

    if (clearContent) {
      this.targetElement.innerHTML = ''
    }
  }

  /**
   * Cleans up resources: stops the timeout loop and optionally removes injected CSS.
   * Call this when the animator instance is no longer needed to prevent memory leaks.
   * @param {boolean} [removeInjectedStyle] - If true and CSS was injected by this instance, removes the <style> tag. Be cautious if multiple instances share the same styleId.
   */
  public destroy(removeInjectedStyle: boolean = false): void {
    this.reset(false) // Stop processing, clear queue, keep content

    if (removeInjectedStyle && this.injectedStyleElement && this.injectedStyleElement.parentNode) {
      this.injectedStyleElement.parentNode.removeChild(this.injectedStyleElement)
      this.injectedStyleElement = null
    }
    // console.log("StreamingTextAnimator instance destroyed.");
  }
}

// Optional: Export the interface as well
// export type { AnimatorOptions };

// Default export for easier import
export default StreamingTextAnimator
