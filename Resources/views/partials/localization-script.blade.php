@php
    $viewTranslations = app(\App\Services\LocalizationService::class)
        ->translationsFor(app()->getLocale());
@endphp
<script>
    (() => {
        const translations = @json($viewTranslations);
        const ignored = 'script,style,code,pre,textarea,[contenteditable="true"],[data-i18n-ignore]';
        const attributes = ['placeholder', 'title', 'aria-label'];
        const translate = (value) => translations[value] || value;

        const translateNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const parent = node.parentElement;
                const source = node.nodeValue || '';
                const key = source.trim();

                if (!parent || !key || parent.closest(ignored)) return;

                const leading = source.match(/^\s*/)?.[0] || '';
                const trailing = source.match(/\s*$/)?.[0] || '';
                node.nodeValue = `${leading}${translate(key)}${trailing}`;
                return;
            }

            if (!(node instanceof Element) || node.closest(ignored)) return;

            attributes.forEach((attribute) => {
                if (!node.hasAttribute(attribute)) return;
                node.setAttribute(attribute, translate(node.getAttribute(attribute) || ''));
            });
        };

        const translateTree = (root) => {
            translateNode(root);
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            );
            let node = walker.nextNode();

            while (node) {
                translateNode(node);
                node = walker.nextNode();
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
            translateTree(document.body);

            new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'characterData') {
                        translateNode(mutation.target);
                    } else {
                        mutation.addedNodes.forEach(translateTree);
                    }
                });
            }).observe(document.body, {
                subtree: true,
                childList: true,
                characterData: true,
            });
        });
    })();
</script>
