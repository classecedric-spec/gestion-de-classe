import React, { useState } from 'react';
import { Camera, X, LucideIcon, Layers } from 'lucide-react';
import clsx from 'clsx';
import { resizeAndConvertToBase64, compressImage, uploadImageToStorage } from '../lib/storage';
import { toast } from 'sonner';

export interface ImageUploadProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    placeholderIcon?: LucideIcon;
    className?: string;
    storagePath?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    label = "Photo",
    placeholderIcon: PlaceholderIcon = Layers,
    className,
    storagePath
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    const processFile = async (file: File) => {
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg')) {
            try {
                setIsCompressing(true);
                // First resize to get base64
                const base64 = await resizeAndConvertToBase64(file, 200, 200);
                // Then compress to target size (100x100, max 10KB)
                const compressed = await compressImage(base64, 100, 100, 10);

                if (storagePath) {
                    const publicUrl = await uploadImageToStorage(compressed as string, storagePath);
                    if (publicUrl) {
                        onChange(publicUrl);
                    } else {
                        toast.error("Erreur lors de l'envoi au stockage");
                    }
                } else {
                    onChange(compressed as string);
                }

                toast.success("Photo optimisée automatiquement");
            } catch (err) {
                toast.error("Erreur lors du traitement de l'image");
            } finally {
                setIsCompressing(false);
            }
        } else {
            toast.error("Format non supporté. Veuillez utiliser JPG ou PNG.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    return (
        <div className={clsx("flex flex-col items-center gap-2", className)}>
            <div
                className={clsx(
                    "w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center relative group overflow-hidden shadow-inner transition-all",
                    isDragging ? "border-primary bg-primary/20 scale-105" : "bg-white/5 border-white/20",
                    value && "bg-primary"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {value ? (
                    <img src={value} alt="Preview" className="w-[90%] h-[90%] object-contain" />
                ) : isCompressing ? (
                    <div className="flex flex-col items-center justify-center text-primary">
                        <Camera size={24} className="animate-pulse" />
                        <span className="text-[8px] mt-1">Optimisation...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-grey-medium">
                        {isDragging ? <Camera size={24} className="text-primary animate-bounce" /> : <PlaceholderIcon size={32} />}
                    </div>
                )}

                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange('');
                        }}
                        className="absolute top-1 right-1 z-20 p-1.5 bg-danger hover:bg-danger/80 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-75 hover:scale-90"
                        title="Supprimer la photo"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                )}

                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                    <Camera className="text-white mb-1" size={20} />
                    <span className="text-[8px] text-white font-bold uppercase tracking-wider">Modifier</span>
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden"
                        onChange={handleFileChange}
                        title="Modifier la photo"
                    />
                </label>
            </div>
            <p className="text-[10px] font-bold text-grey-medium uppercase tracking-wider">
                {isDragging ? "Déposez l'image ici" : label}
            </p>
        </div>
    );
};

export default ImageUpload;
