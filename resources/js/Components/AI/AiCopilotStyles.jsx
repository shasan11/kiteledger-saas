import { theme } from 'antd';

/*
 * Shared motion and surface treatment for the Copilot.
 *
 * Injected once rather than repeated inline so every surface shares one
 * elevation scale and one animation rhythm — inconsistent shadows and
 * timings are the main reason an interface reads as "assembled" rather
 * than designed.
 *
 * All motion is wrapped in prefers-reduced-motion. Accounting users often
 * work long sessions; movement they did not ask for is fatiguing, and for
 * vestibular sensitivity it is harmful.
 */
export default function AiCopilotStyles() {
    const { token } = theme.useToken();

    return (
        <style>{`
            @keyframes kl-rise {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: none; }
            }

            @keyframes kl-pulse {
                0%, 100% { opacity: 0.35; transform: scale(0.85); }
                50%      { opacity: 1;    transform: scale(1); }
            }

            /* Entrance: 220ms ease-out sits in the 150-300ms band where motion
               reads as responsive rather than sluggish. */
            .kl-rise {
                animation: kl-rise 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
            }

            .kl-dot {
                width: 6px;
                height: 6px;
                border-radius: 999px;
                background: ${token.colorPrimary};
                display: inline-block;
                animation: kl-pulse 1.2s ease-in-out infinite;
            }

            /* Staggered so the three dots read as one object, not three timers. */
            .kl-dot:nth-child(2) { animation-delay: 0.16s; }
            .kl-dot:nth-child(3) { animation-delay: 0.32s; }

            /* Figures use tabular numerals so digits line up in columns and
               values do not jitter as they change. */
            .kl-tabular {
                font-variant-numeric: tabular-nums;
                font-feature-settings: 'tnum';
            }

            .kl-prompt-card {
                transition: border-color 160ms ease-out, transform 160ms ease-out, box-shadow 160ms ease-out;
                cursor: pointer;
            }

            .kl-prompt-card:hover {
                border-color: ${token.colorPrimaryBorderHover};
                box-shadow: ${token.boxShadowTertiary};
                /* Transform only — animating size would reflow the grid. */
                transform: translateY(-2px);
            }

            .kl-prompt-card:focus-visible {
                outline: 2px solid ${token.colorPrimary};
                outline-offset: 2px;
            }

            @media (prefers-reduced-motion: reduce) {
                .kl-rise,
                .kl-dot,
                .kl-prompt-card {
                    animation: none !important;
                    transition: none !important;
                    transform: none !important;
                }
            }
        `}</style>
    );
}
