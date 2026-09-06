import { RiSparkling2Fill } from 'react-icons/ri';

export default function CopilotMark({ size = 34, style = {}, className, ...props }) {
    const iconSize = Math.round(size * 0.9);
    const iconStyle = {
        width: iconSize,
        height: iconSize,
        display: 'block',
    };

    return (
        <span
            {...props}
            className={className}
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                flex: '0 0 auto',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0,
                color: '#6ee7b7',
                ...style,
            }}
        >
            <RiSparkling2Fill style={iconStyle} />
            <RiSparkling2Fill
                style={{
                    ...iconStyle,
                    position: 'absolute',
                    inset: '50% auto auto 50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#047857',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 4%, #000 96%)',
                    maskImage: 'linear-gradient(to bottom, transparent 4%, #000 96%)',
                }}
            />
        </span>
    );
}
