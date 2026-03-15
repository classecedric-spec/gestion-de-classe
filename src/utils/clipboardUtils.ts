export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for non-secure contexts (e.g., local network IP)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // Avoid scrolling to bottom
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                return successful;
            } catch (err) {
                console.error('Fallback clipboard copy failed', err);
                return false;
            } finally {
                textArea.remove();
            }
        }
    } catch (error) {
        console.error('Clipboard copy failed', error);
        return false;
    }
};
