import React, { useState } from 'react';
import { Camera, Loader2, User, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
    src?: string | null;
    alt?: string;
    initials?: string;
    icon?: LucideIcon;
    size?: AvatarSize;
    className?: string;
    editable?: boolean;
    loading?: boolean;
    onImageChange?: (file: File) => void | Promise<void>;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, file: File) => void;
}

/**
 * Avatar component for displaying user photos or initials
 * Supports drag & drop, file upload, and loading states
 * 
 * @example
 * // Basic usage with initials
 * <Avatar initials="JD" />
 * 
 * @example
 * // With image
 * <Avatar src="/path/to/image.jpg" alt="John Doe" />
 * 
 * @example
 * // Editable with drag & drop
 * <Avatar 
 *   editable 
 *   initials="JD"
 *   onImageChange={(file) => console.log('New image:', file)}
 * />
 * 
 * @example
 * // Different sizes
 * <Avatar size="xs" initials="JD" />
 * <Avatar size="2xl" src="/image.jpg" />
 */
const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = 'Avatar',
    initials,
    icon: Icon,
    size = 'md',
    className,
    editable = false,
    loading = false,
    onImageChange,
    onDragOver,
    onDragLeave,
    onDrop
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const sizeClasses: Record<AvatarSize, string> = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-10 h-10 text-sm',
        md: 'w-12 h-12 text-base',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-24 h-24 text-3xl',
        '2xl': 'w-32 h-32 text-4xl'
    };

    const iconSizes: Record<AvatarSize, number> = {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
        '2xl': 40
    };

    const cameraIconSizes: Record<AvatarSize, number> = {
        xs: 8,
        sm: 12,
        md: 14,
        lg: 18,
        xl: 24,
        '2xl': 28
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        onDragOver?.(e);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onDragLeave?.(e);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            onDrop?.(e, file);
            if (onImageChange) {
                await onImageChange(file);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImageChange) {
            await onImageChange(file);
        }
    };

    const handleClick = () => {
        if (editable && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div
            className={clsx(
                'relative rounded-full flex items-center justify-center font-bold shadow-inner overflow-hidden transition-all',
                sizeClasses[size],
                src ? 'bg-primary' : 'bg-surface',
                editable && 'cursor-pointer group',
                isDragging && 'ring-2 ring-primary scale-110 bg-primary/20',
                className
            )}
            onDragOver={editable ? handleDragOver : undefined}
            onDragLeave={editable ? handleDragLeave : undefined}
            onDrop={editable ? handleDrop : undefined}
            onClick={editable ? handleClick : undefined}
        >
            {loading ? (
                <Loader2 className="animate-spin text-primary" size={iconSizes[size]} />
            ) : src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
            ) : initials ? (
                <span className="text-primary select-none">{initials}</span>
            ) : Icon ? (
                <Icon className="text-primary" size={iconSizes[size]} />
            ) : (
                <User className="text-grey-medium" size={iconSizes[size]} />
            )}

            {editable && !loading && (
                <>
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white mb-1" size={cameraIconSizes[size]} />
                        {(size === 'lg' || size === 'xl' || size === '2xl') && (
                            <span className="text-[10px] text-white font-black uppercase tracking-tighter">
                                Changer
                            </span>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        title="Changer l'image"
                    />
                </>
            )}

            {isDragging && editable && (
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <Camera className="text-primary animate-bounce" size={iconSizes[size]} />
                </div>
            )}
        </div>
    );
};

export default Avatar;
