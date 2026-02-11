
import { useEffect, useRef } from 'react';

/**
 * A custom hook that triggers a callback when a click is detected outside of a specified element.
 * @param handler The function to call on an outside click.
 * @returns A ref object to be attached to the DOM element.
 */
export const useClickOutside = <T extends HTMLElement>(handler: () => void) => {
    const domNode = useRef<T>(null);

    useEffect(() => {
        const maybeHandler = (event: MouseEvent) => {
            if (domNode.current && !domNode.current.contains(event.target as Node)) {
                handler();
            }
        };

        document.addEventListener('mousedown', maybeHandler);

        return () => {
            document.removeEventListener('mousedown', maybeHandler);
        };
    }, [handler]);

    return domNode;
};
