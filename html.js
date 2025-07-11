import * as cheerio from 'cheerio';

export function parseHTML(html) {
  if (typeof html !== 'string') {
    throw new Error('Invalid HTML input: must be a string');
  }
  const $ = cheerio.load(html, {xmlMode: false, decodeEntities: true, normalizeWhitespace: true});

  class Selection {
    constructor(elements) {
      this.elements = elements;
    }

    // Get the value of an attribute for the first element
    attr(name) {
      if (name === 'tagName') {
        const tag = this.elements.prop('tagName');
        return tag ? tag.toUpperCase() : undefined;
      }
      return this.elements.attr(name);
    }

    // Get the children of each element, optionally filtered by a selector
    children(selector) {
      const newElements = selector
          ? this.elements.children(selector)
          : this.elements.children();
      return new Selection(newElements);
    }

    // Get the first element that matches the selector by traversing up through ancestors
    closest(selector) {
      const newElements = this.elements.closest(selector);
      return new Selection(newElements);
    }

    // Get the children, including text and comment nodes
    contents() {
      const newElements = this.elements.contents();
      return new Selection(newElements);
    }

    // Mimic k6/html Data method
    data(...args) {
      if (!this.elements.length) {
        return undefined;
      }
      const firstElement = this.elements.first();
      if (args.length > 0) {
        const key = args[0];
        const attrKey = `data-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        const value = firstElement.attr(attrKey);
        return value !== undefined ? value : undefined;
      }
      const data = {};
      const attrs = firstElement[0]?.attribs || {};
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('data-') && key.length > 5) {
          const dataKey = key
              .slice(5)
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          data[dataKey] = value;
        }
      }
      return Object.keys(data).length > 0 ? data : undefined;
    }

    // Iterate over elements, calling callback(index, selection)
    each(callback) {
      this.elements.each((index, element) =>
          callback(index, new Selection($(element)))
      );
      return this;
    }

    // Reduce to the element at the specified index
    eq(index) {
      const newElements = this.elements.eq(index);
      return new Selection(newElements);
    }

    // Filter elements by selector
    filter(selector) {
      const newElements = this.elements.filter(selector);
      return new Selection(newElements);
    }

    // Find descendant elements by selector
    find(selector) {
      const newElements = this.elements.find(selector);
      return new Selection(newElements);
    }

    // Reduce to the first element
    first() {
      const newElements = this.elements.first();
      return new Selection(newElements);
    }

    // Retrieve the k6/html Element at the specified index
    get(index) {
      const element = this.elements.get(index);
      return element ? new Selection($(element)) : undefined;
    }

    // Reduce to elements that have a descendant matching the selector
    has(selector) {
      const newElements = this.elements.has(selector);
      return new Selection(newElements);
    }

    // Get the HTML contents of the first element
    html() {
      return this.elements.html() || '';
    }

    // Check if at least one element matches the selector
    is(selector) {
      return this.elements.is(selector);
    }

    // Reduce to the last element
    last() {
      const newElements = this.elements.last();
      return new Selection(newElements);
    }

    // Map elements to an array by calling callback(index, selection)
    map(callback) {
      const result = [];
      this.elements.each((index, element) => {
        const value = callback(index, new Selection($(element)));
        if (value !== undefined) {
          result.push(value);
        }
      });
      return result;
    }

    // Get all following siblings, optionally filtered by selector
    nextAll(selector) {
      const newElements = selector
          ? this.elements.nextAll(selector)
          : this.elements.nextAll();
      return new Selection(newElements);
    }

    // Get the immediately following sibling, optionally filtered by selector
    next(selector) {
      const newElements = selector
          ? this.elements.next(selector)
          : this.elements.next();
      return new Selection(newElements);
    }

    // Get all following siblings up to but not including the selector
    nextUntil(selector, filter) {
      const newElements = filter
          ? this.elements.nextUntil(selector, filter)
          : this.elements.nextUntil(selector);
      return new Selection(newElements);
    }

    // Remove elements matching the selector
    not(selector) {
      const newElements = this.elements.not(selector);
      return new Selection(newElements);
    }

    // Get the parent, optionally filtered by selector
    parent(selector) {
      const newElements = selector
          ? this.elements.parent(selector)
          : this.elements.parent();
      return new Selection(newElements);
    }

    // Get all ancestors, optionally filtered by selector
    parents(selector) {
      const newElements = selector
          ? this.elements.parents(selector)
          : this.elements.parents();
      return new Selection(newElements);
    }

    // Get ancestors up to but not including the selector
    parentsUntil(selector, filter) {
      const newElements = filter
          ? this.elements.parentsUntil(selector, filter)
          : this.elements.parentsUntil(selector);
      return new Selection(newElements);
    }

    // Get all preceding siblings, optionally filtered by selector
    prevAll(selector) {
      const newElements = selector
          ? this.elements.prevAll(selector)
          : this.elements.prevAll();
      return new Selection(newElements);
    }

    // Get the immediately preceding sibling, optionally filtered by selector
    prev(selector) {
      const newElements = selector
          ? this.elements.prev(selector)
          : this.elements.prev();
      return new Selection(newElements);
    }

    // Get all preceding siblings up to but not including the selector
    prevUntil(selector, filter) {
      const newElements = filter
          ? this.elements.prevUntil(selector, filter)
          : this.elements.prevUntil(selector);
      return new Selection(newElements);
    }

    // Encode form elements as a URL-encoded string
    serialize() {
      const form = this.elements.filter('form').first();
      if (!form.length) return '';
      const result = [];
      form.find('input, select, textarea').each((_, el) => {
        const $el = $(el);
        const name = $el.attr('name');
        const value = $el.val();
        if (name && value !== undefined) {
          result.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
        }
      });
      return result.join('&');
    }

    // Encode form elements as an array of names and values
    serializeArray() {
      const form = this.elements.filter('form').first();
      if (!form.length) return [];
      const result = [];
      form.find('input, select, textarea').each((_, el) => {
        const $el = $(el);
        const name = $el.attr('name');
        const value = $el.val();
        if (name && value !== undefined) {
          result.push({name, value});
        }
      });
      return result;
    }

    // Encode form elements as an object
    serializeObject() {
      const form = this.elements.filter('form').first();
      if (!form.length) return {};
      const result = {};
      form.find('input, select, textarea').each((_, el) => {
        const $el = $(el);
        const name = $el.attr('name');
        const value = $el.val();
        if (name && value !== undefined) {
          result[name] = value;
        }
      });
      return result;
    }

    // Return the number of elements
    size() {
      return this.elements.length;
    }

    // Reduce to a subset of elements by index range
    slice(start, end) {
      const newElements = this.elements.slice(start, end);
      return new Selection(newElements);
    }

    // Get the text content of the selection
    text() {
      return this.elements.text().trim();
    }

    // Retrieve all elements as an array of Selection objects
    toArray() {
      const result = [];
      this.elements.each((_, element) => {
        result.push(new Selection($(element)));
      });
      return result;
    }

    // Get the value of the first element
    val() {
      return this.elements.val();
    }
  }

    // Return a Selection object initialized with the entire document
    return new Selection($.root());
}