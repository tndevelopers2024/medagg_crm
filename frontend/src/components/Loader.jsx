
import React from 'react';

/**
 * A uniform loader component for the application.
 * 
 * Props:
 * - fullScreen (bool): If true, centers the loader in a large container (min-h-[50vh]).
 * - size (string): 'small', 'medium', 'large' (default: 'medium').
 * - text (string): Optional text to display below the spinner.
 */
export default function Loader({ fullScreen = false, size = 'medium', text = null }) {
    const dimensions = {
        small: 'w-5 h-5 border-2',
        medium: 'w-10 h-10 border-[3px]',
        large: 'w-16 h-16 border-4',
    };

    const currentDim = dimensions[size] || dimensions.medium;

    // Using the primary color #322554 from index.css for the top border,
    // and varied opacity for the others to create a nice trail effect.
    const spinnerClasses = `
    animate-spin 
    rounded-full 
    ${currentDim} 
    border-gray-200
    border-t-[#322554]
  `;

    // Content of the loader
    const content = (
        <div className="flex flex-col items-center justify-center">
            <div className={`
        ${spinnerClasses}
      `} />
            {text && (
                <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );

    // If fullScreen, wrap in a container that takes up space
    if (fullScreen) {
        return (
            <div className="flex items-center justify-center w-full min-h-[50vh] flex-1">
                {content}
            </div>
        );
    }

    return content;
}
