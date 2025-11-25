import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthCredentials {
  token: string;
  username: string;
  phone?: string;
}

interface AuthContextType {
  credentials: AuthCredentials | null;
  isLoading: boolean;
  isSignedIn: boolean;
  setCredentials: (credentials: AuthCredentials) => Promise<void>;
  clearCredentials: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "auth_credentials";

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [credentials, setCredentialsState] = useState<AuthCredentials | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load credentials from storage on app start
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedCredentials = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedCredentials) {
          setCredentialsState(JSON.parse(savedCredentials));
        }
      } catch (error) {
        console.error("Failed to load credentials:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCredentials();
  }, []);

  const setCredentials = async (newCredentials: AuthCredentials) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
      setCredentialsState(newCredentials);
    } catch (error) {
      console.error("Failed to save credentials:", error);
      throw error;
    }
  };

  const clearCredentials = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setCredentialsState(null);
    } catch (error) {
      console.error("Failed to clear credentials:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        credentials,
        isLoading,
        isSignedIn: credentials !== null,
        setCredentials,
        clearCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
