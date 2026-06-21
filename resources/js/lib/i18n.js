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
    'svg',
    'canvas',
    'code',
    'pre',
    'textarea',
    '[contenteditable="true"]',
    '[data-i18n-ignore]',
    '.recharts-wrapper',
].join(',');

const hasEffectiveTranslations = (translations = {}) =>
    Object.entries(translations).some(
        ([key, value]) => typeof value === 'string' && value !== '' && value !== key,
    );

const scheduleIdle = (callback) => {
    if (typeof window === 'undefined') return 0;

    if (typeof window.requestIdleCallback === 'function') {
        return window.requestIdleCallback(callback, { timeout: 250 });
    }

    return window.requestAnimationFrame(callback);
};

const cancelIdle = (handle) => {
    if (!handle || typeof window === 'undefined') return;

    if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle);
        return;
    }

    window.cancelAnimationFrame(handle);
};

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
        if (!hasEffectiveTranslations(translations)) return undefined;

        const pendingNodes = new Set();
        let scheduledHandle = 0;

        const flush = () => {
            scheduledHandle = 0;
            const nodes = Array.from(pendingNodes);
            pendingNodes.clear();

            nodes.forEach((node) => translateTree(node, translations));
        };

        const enqueue = (node) => {
            if (!node) return;

            pendingNodes.add(node);

            if (!scheduledHandle) {
                scheduledHandle = scheduleIdle(flush);
            }
        };

        enqueue(document.body || document.documentElement);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') {
                    enqueue(mutation.target);
                    return;
                }

                if (mutation.type === 'attributes') {
                    enqueue(mutation.target);
                    return;
                }

                mutation.addedNodes.forEach(enqueue);
            });
        });

        observer.observe(document.body || document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: translatedAttributes,
        });

        return () => {
            observer.disconnect();
            cancelIdle(scheduledHandle);
            pendingNodes.clear();
        };
    }, [translations]);
}
