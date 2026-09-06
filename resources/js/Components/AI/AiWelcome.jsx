import { Typography, theme } from 'antd';
import CopilotMark from '@/Components/AI/CopilotMark';

const { Title, Text } = Typography;

/*
 * Prompts grouped by intent, not listed flat.
 *
 * A flat list of eight sentences is read as a wall; four labelled groups let
 * someone find the shape of their question first and the wording second.
 * Each group leads with a concrete example rather than a category name alone.
 */
const GROUPS = [
    {
        key: 'general',
        label: 'Start a conversation',
        prompts: ['Hello - what can you help me with?'],
    },
    {
        key: 'financial',
        requires: 'financial',
        label: 'Financial position',
        prompts: [
            'Give me a financial overview for this fiscal year.',
            'How are sales performing this month?',
        ],
    },
    {
        key: 'receivables',
        requires: 'financial',
        label: 'Money owed',
        prompts: [
            'Which customers owe us the most?',
            'Which supplier bills are due soon?',
        ],
    },
    {
        key: 'records',
        requires: 'tools',
        label: 'Find a record',
        prompts: [
            'Find invoice INV-0001.',
            'Show payments received from a customer.',
        ],
    },
    {
        key: 'help',
        requires: 'rag',
        label: 'How to use KiteLedger',
        prompts: [
            'How do I create and send an invoice?',
            'Which report shows the trial balance?',
        ],
    },
];

/**
 * First-run state for the Copilot.
 *
 * Replaces a generic "no messages" empty state. An empty chat gives the user
 * nothing to act on; showing what the assistant is actually good at is what
 * turns a blank screen into a starting point.
 */
export default function AiWelcome({ onSelect, disabled = false, isMobile = false, capabilities = {} }) {
    const { token } = theme.useToken();
    const groups = GROUPS.filter((group) => {
        if (!group.requires) return true;
        if (group.requires === 'financial') return capabilities.financialTools;
        if (group.requires === 'tools') return capabilities.toolCalling;
        if (group.requires === 'rag') return capabilities.rag;
        return false;
    });
    const suggestions = groups
        .flatMap((group) => group.prompts.map((prompt) => ({ prompt, label: group.label })))
        .slice(0, 6);

    return (
        <div className="kl-rise" style={{ width: '100%', maxWidth: 720, padding: isMobile ? '20px 4px' : '36px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CopilotMark size={isMobile ? 42 : 48} />
                <div style={{ minWidth: 0 }}>
                    <Title
                        level={2}
                        style={{ margin: 0, fontSize: isMobile ? 23 : 28, lineHeight: 1.2, letterSpacing: '-0.03em' }}
                    >
                        How can I help?
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 14, lineHeight: 1.5 }}>
                        Ask about your business, find a record, or learn how KiteLedger works.
                    </Text>
                </div>
            </div>

            <Text strong style={{ display: 'block', margin: '30px 0 10px', fontSize: 13 }}>
                Try asking
            </Text>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                }}
            >
                {suggestions.map(({ prompt, label }) => (
                    <button
                        key={prompt}
                        type="button"
                        className="kl-prompt-card"
                        disabled={disabled}
                        onClick={() => onSelect?.(prompt)}
                        style={{
                            width: '100%',
                            minHeight: 64,
                            padding: '10px 12px',
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            background: token.colorBgContainer,
                            color: disabled ? token.colorTextDisabled : token.colorText,
                            textAlign: 'left',
                            font: 'inherit',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Text type="secondary" style={{ display: 'block', fontSize: 11, lineHeight: 1.25 }}>
                            {label}
                        </Text>
                        <span style={{ display: 'block', marginTop: 3, fontSize: 14, lineHeight: 1.4 }}>
                            {prompt}
                        </span>
                    </button>
                ))}
            </div>

        </div>
    );
}
