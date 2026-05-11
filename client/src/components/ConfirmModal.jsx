import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    title = 'Confirm Action', 
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDanger = false
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease-out'
                }}
                onClick={onCancel}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-xl)',
                    maxWidth: 400,
                    width: '90%',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'slideUp 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onCancel}
                    style={{
                        position: 'absolute',
                        top: 'var(--space-md)',
                        right: 'var(--space-md)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        transition: 'all var(--transition-fast)',
                        ':hover': {
                            background: 'var(--bg-elevated)'
                        }
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-lg)',
                        background: isDanger ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        marginBottom: 'var(--space-md)'
                    }}
                >
                    <AlertCircle
                        size={28}
                        color={isDanger ? 'var(--error)' : 'var(--primary-500)'}
                    />
                </div>

                {/* Title */}
                <h2
                    style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-sm)',
                        color: 'var(--text-primary)'
                    }}
                >
                    {title}
                </h2>

                {/* Message */}
                <p
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--space-lg)',
                        lineHeight: 1.5
                    }}
                >
                    {message}
                </p>

                {/* Buttons */}
                <div
                    style={{
                        display: 'flex',
                        gap: 'var(--space-sm)',
                        justifyContent: 'flex-end'
                    }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-light)',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'var(--bg-elevated)';
                            e.target.style.borderColor = 'var(--border-medium)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.borderColor = 'var(--border-light)';
                        }}
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: isDanger ? 'var(--error)' : 'var(--primary-500)',
                            color: 'white',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.opacity = '0.9';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.opacity = '1';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -48%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            `}</style>
        </>
    );
};

export default ConfirmModal;
