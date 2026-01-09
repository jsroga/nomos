'use client';

import { cn } from '@/lib/utils';
import { motion, Transition } from 'framer-motion';

export type GlowEffectProps = {
    className?: string;
    style?: React.CSSProperties;
    colors?: string[];
    mode?: 'static' | 'colorShift' | 'shine' | 'spotlight';
    blur?: 'soft' | 'medium' | 'strong';
    duration?: number;
    scale?: number;
};

export function GlowEffect({
    className,
    style,
    colors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F'],
    mode = 'static',
    blur = 'medium',
    duration = 3,
    scale = 1,
}: GlowEffectProps) {
    const blurClasses = {
        soft: 'blur-xl',
        medium: 'blur-2xl',
        strong: 'blur-3xl',
    };

    const backgroundStyle = {
        background: `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`,
    };

    const getTransition = (mode: string): Transition => {
        switch (mode) {
            case 'colorShift':
                return {
                    duration: duration,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'linear',
                };
            case 'shine':
                return {
                    duration: duration,
                    repeat: Infinity,
                    ease: 'linear',
                };
            default:
                return {};
        }
    };

    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-0 -z-10 h-full w-full',
                className
            )}
            style={{
                transform: `scale(${scale})`,
                ...style,
            }}
        >
            <motion.div
                className={cn(
                    'h-full w-full rounded-[inherit] opacity-100',
                    blurClasses[blur]
                )}
                style={backgroundStyle}
                animate={
                    mode === 'colorShift'
                        ? { rotate: 360 }
                        : {}
                }
                transition={
                    mode === 'colorShift'
                        ? { duration: duration, repeat: Infinity, ease: 'linear' }
                        : {}
                }
            />
        </div>
    );
}
