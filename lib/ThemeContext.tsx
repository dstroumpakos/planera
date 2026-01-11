import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexAuth } from 'convex/react';

// Planera Colors
export const LIGHT_COLORS = {
    primary: "#FFE500",
    background: "#FAF9F6",
    backgroundSecondary: "#FFFFFF",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    error: "#EF4444",
    cardBackground: "#FFFFFF",
    inputBackground: "#FFFFFF",
};

export const DARK_COLORS = {
    primary: "#FFE500",
    background: "#0D1117",
    backgroundSecondary: "#161B22",
    text: "#F0F6FC",
    textSecondary: "#8B949E",
    textMuted: "#6E7681",
    white: "#FFFFFF",
    border: "#30363D",
    error: "#F85149",
    cardBackground: "#161B22",
    inputBackground: "#21262D",
};

interface ThemeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    colors: typeof LIGHT_COLORS;
}

const ThemeContext = createContext<ThemeContextType>({
    isDarkMode: false,
    toggleDarkMode: () => {},
    colors: LIGHT_COLORS,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useConvexAuth();
    const userSettings = useQuery(
        api.users.getSettings,
        isAuthenticated ? {} : "skip"
    );
    const updateDarkMode = useMutation(api.users.updateDarkMode);
    
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Sync with user settings from database
    useEffect(() => {
        if (userSettings?.darkMode !== undefined) {
            setIsDarkMode(userSettings.darkMode);
        }
    }, [userSettings?.darkMode]);

    const toggleDarkMode = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        
        if (isAuthenticated) {
            try {
                await updateDarkMode({ darkMode: newValue });
            } catch (error) {
                console.error("Failed to save dark mode preference:", error);
            }
        }
    };

    const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
