import {createContext, ReactNode, useContext, useState} from "react";

interface PhoneContextType {
    phoneNumber: string;
    setPhoneNumber: (phone: string) => void;
    confirmationCode: string;
    setConfirmationCode: (code: string) => void;
}

const PhoneContext = createContext<PhoneContextType | undefined>(undefined);

interface PhoneProviderProps {
    children: ReactNode;
}

export const PhoneProvider: React.FC<PhoneProviderProps> = ({children}) => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [confirmationCode, setConfirmationCode] = useState("");

    return (
        <PhoneContext.Provider value={{phoneNumber, setPhoneNumber, confirmationCode, setConfirmationCode}}>
            {children}
        </PhoneContext.Provider>
    );
};

export const usePhone = (): PhoneContextType => {
    const context = useContext(PhoneContext);
    if (!context) {
        throw new Error("usePhone must be used within a PhoneProvider");
    }

    return context;
};
