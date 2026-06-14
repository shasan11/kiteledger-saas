import { usePage } from '@inertiajs/react';
import { useCallback, useEffect } from 'react';

let currentTranslations = {};
let currentLocale = {
    current: 'en',
    fallback: 'en',
    dir: 'ltr',
    supported: [],
};

const replaceTokens = (value, replacements) =>
    Object.entries(replacements).reduce(
        (translated, [name, replacement]) =>
            translated.replaceAll(`:${name}`, String(replacement)),
        value,
    );

const textNodeState = new WeakMap();
const attributeState = new WeakMap();
const translatedAttributes = ['placeholder', 'title', 'aria-label', 'data-empty-text'];
const ignoredSelector = [
    'script',
    'style',
    'code',
    'pre',
    'textarea',
    '[contenteditable="true"]',
    '[data-i18n-ignore]',
].join(',');

const translateValue = (value, translations) => {
    const exact = translations?.[value];

    if (typeof exact === 'string' && exact !== '') {
        return exact;
    }

    return value;
};

const translateTextNode = (node, translations) => {
    const parent = node.parentElement;

    if (!parent || parent.closest(ignoredSelector)) return;

    const current = node.nodeValue || '';
    const trimmed = current.trim();

    if (!trimmed) return;

    let state = textNodeState.get(node);

    if (!state) {
        state = { source: trimmed, lastApplied: null };
        textNodeState.set(node, state);
    } else if (state.lastApplied !== null && trimmed !== state.lastApplied) {
        state.source = trimmed;
    }

    const translated = translateValue(state.source, translations);
    const leading = current.match(/^\s*/)?.[0] || '';
    const trailing = current.match(/\s*$/)?.[0] || '';
    const next = `${leading}${translated}${trailing}`;

    state.lastApplied = translated;

    if (current !== next) {
        node.nodeValue = next;
    }
};

const translateElementAttributes = (element, translations) => {
    if (!(element instanceof Element) || element.closest(ignoredSelector)) return;

    let states = attributeState.get(element);

    if (!states) {
        states = new Map();
        attributeState.set(element, states);
    }

    translatedAttributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;

        const current = element.getAttribute(attribute) || '';
        let state = states.get(attribute);

        if (!state) {
            state = { source: current, lastApplied: null };
            states.set(attribute, state);
        } else if (state.lastApplied !== null && current !== state.lastApplied) {
            state.source = current;
        }

        const translated = translateValue(state.source, translations);
        state.lastApplied = translated;

        if (translated !== current) {
            element.setAttribute(attribute, translated);
        }
    });
};

const translateTree = (root, translations) => {
    if (root instanceof Text) {
        translateTextNode(root, translations);
        return;
    }

    if (!(root instanceof Element) && root !== document) return;

    if (root instanceof Element) {
        translateElementAttributes(root, translations);
    }

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();

    while (node) {
        if (node instanceof Text) {
            translateTextNode(node, translations);
        } else {
            translateElementAttributes(node, translations);
        }

        node = walker.nextNode();
    }
};

export function t(key, replacements = {}) {
    const translated = currentTranslations?.[key] ?? key;

    return replaceTokens(String(translated), replacements);
}

export function useTrans() {
    const page = usePage();
    currentTranslations = page.props.translations || {};
    currentLocale = page.props.locale || currentLocale;

    return useCallback(
        (key, replacements = {}) => {
            const translated = page.props.translations?.[key] ?? key;

            return replaceTokens(String(translated), replacements);
        },
        [page.props.translations],
    );
}

export function getLocale() {
    return currentLocale;
}

export function isRtl() {
    return currentLocale?.dir === 'rtl';
}

export function useLegacyViewTranslations(translations = {}) {
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;

        translateTree(document, translations);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') {
                    translateTextNode(mutation.target, translations);
                    return;
                }

                if (mutation.type === 'attributes') {
                    translateElementAttributes(mutation.target, translations);
                    return;
                }

                mutation.addedNodes.forEach((node) => translateTree(node, translations));
            });
        });

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: translatedAttributes,
        });

        return () => observer.disconnect();
    }, [translations]);
}
