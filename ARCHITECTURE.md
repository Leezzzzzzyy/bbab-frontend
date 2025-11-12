# Architecture Diagram: Authentication System

## Component Hierarchy

```
Root Layout (_layout.tsx)
    │
    ├─── AuthProvider (New)
    │       │
    │       └─── RootLayoutContent
    │           │
    │           ├─── checks isSignedIn
    │           ├─── shows Splash Screen
    │           └─── routes to:
    │               ├─ /(auth) if NOT signed in
    │               └─ /messages if signed in
    │
    └─── Stack Navigation
            │
            ├─── (auth) Stack
            │       │
            │       ├─── authHandler
            │       │       │
            │       │       └─── PhoneProvider
            │       │           │
            │       │           └─── AuthCarousel
            │       │               │
            │       │               ├─── Step1 (Phone)
            │       │               ├─── Step2 (Code) → saves confirmationCode
            │       │               └─── Step3 (Profile) → saves credentials
            │       │
            │       └─── Auth Screens
            │
            └─── (tabs) Stack
                    │
                    └─── Main App Screens
                            ├─── Messages
                            ├─── Profile
                            └─── etc.
```

## Data Flow: First Time User

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP START                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  RootLayout wraps    │
                    │  with AuthProvider   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────────────┐
                    │ AuthProvider.loadCredentials │
                    │ (from AsyncStorage)          │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ Found? (First time) │
                    └──────────┬──────────┘
                               │ No credentials
                               ▼
                    ┌──────────────────────┐
                    │ isSignedIn = false   │
                    │ Show Splash (2s)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Route to /(auth)     │
                    │ Show Step 1          │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
    Step 1: Enter         Step 2: Enter         Step 3: Create
    Phone Number          SMS Code              Profile
    │                     │                     │
    │ setPhoneNumber()    │ setConfirmationCode()
    │                     │                     
    └─────────┬───────────┘                     │
              │                                 │
              └─────────────┬───────────────────┘
                            │
                            ▼
                    ┌────────────────────┐
                    │ API.confirmLogin() │
                    │ Returns: {token}   │
                    └────────┬───────────┘
                             │
                             ▼
                    ┌───────────────────────────┐
                    │ setCredentials() saves    │
                    │ to AsyncStorage:          │
                    │ {token, username, phone}  │
                    └────────┬──────────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ isSignedIn = true │
                    │ Route to /messages│
                    └───────────────────┘
```

## Data Flow: Returning User

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP START                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  RootLayout wraps    │
                    │  with AuthProvider   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌────────────────────────────────┐
                    │ AuthProvider.loadCredentials   │
                    │ (from AsyncStorage)            │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────┴──────────┐
                    │ Found credentials!    │
                    └────────────┬──────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │ setCredentialsState()│
                    │ isSignedIn = true    │
                    │ Show Splash (2s)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Route to /messages   │
                    │ Show Main App        │
                    │ (No Login Needed!)   │
                    └──────────────────────┘
```

## Context Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                    Root Layout                         │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │       AuthProvider (NEW)                        │   │
│  │                                                 │   │
│  │  State:                                         │   │
│  │  - credentials: AuthCredentials | null          │   │
│  │  - isLoading: boolean                           │   │
│  │  - isSignedIn: boolean (derived)                │   │
│  │                                                 │   │
│  │  Methods:                                       │   │
│  │  - setCredentials(creds)                        │   │
│  │  - clearCredentials()                           │   │
│  │  - useAuth() hook                               │   │
│  │                                                 │   │
│  │  Storage: AsyncStorage                          │   │
│  │  Key: 'auth_credentials'                        │   │
│  │                                                 │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │      RootLayoutContent                    │  │   │
│  │  │                                           │  │   │
│  │  │  Uses useAuth() to:                       │  │   │
│  │  │  - Check isSignedIn status                │  │   │
│  │  │  - Wait for authLoading to complete       │  │   │
│  │  │  - Determine initial route                │  │   │
│  │  │                                           │  │   │
│  │  │  ┌─────────────────────────────────────┐  │  │   │
│  │  │  │    Stack Navigation                 │  │  │   │
│  │  │  │                                     │  │  │   │
│  │  │  │  /(auth) → PhoneProvider            │  │  │   │
│  │  │  │            - Step1, Step2, Step3    │  │  │   │
│  │  │  │  (tabs) → Main App                  │  │  │   │
│  │  │  │                                     │  │  │   │
│  │  │  └─────────────────────────────────────┘  │  │   │
│  │  │                                           │  │   │
│  │  │  ┌─────────────────────────────────────┐  │  │   │
│  │  │  │    PhoneProvider                    │  │  │   │
│  │  │  │                                     │  │  │   │
│  │  │  │  State:                             │  │  │   │
│  │  │  │  - phoneNumber                      │  │  │   │
│  │  │  │  - confirmationCode                 │  │  │   │
│  │  │  │                                     │  │  │   │
│  │  │  │  Methods:                           │  │  │   │
│  │  │  │  - setPhoneNumber()                 │  │  │   │
│  │  │  │  - setConfirmationCode()            │  │  │   │
│  │  │  │  - usePhone() hook                  │  │  │   │
│  │  │  │                                     │  │  │   │
│  │  │  └─────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## State Management Flow

```
STEP 1: Phone Entry
┌──────────────────┐
│ PhoneContext     │
├──────────────────┤
│ phoneNumber: ""  │
└────────┬─────────┘
         │ User enters phone
         ▼
┌──────────────────────┐
│ phoneNumber: "12345" │
└──────────────────────┘

↓ Next Step

STEP 2: SMS Code
┌──────────────────────────┐
│ PhoneContext             │
├──────────────────────────┤
│ phoneNumber: "12345"     │
│ confirmationCode: ""     │
└────────┬─────────────────┘
         │ User enters code
         ▼
┌──────────────────────────┐
│ phoneNumber: "12345"     │
│ confirmationCode: "25863"│
└──────────────────────────┘

↓ Next Step

STEP 3: Profile Creation + API Call
┌──────────────────────────┐         ┌───────────────────┐
│ PhoneContext             │         │ AuthContext       │
├──────────────────────────┤         ├───────────────────┤
│ phoneNumber: "12345"     │         │ credentials: null │
│ confirmationCode: "25863"│         └───────────────────┘
└──────────────────────────┘
         │ Call API
         ▼
    ┌─────────────────────┐
    │ API.confirmLogin()  │
    │ Returns token       │
    └──────────┬──────────┘
               │
               ▼
         ┌──────────────────────────────────┐
         │ setCredentials({                 │
         │   token: "jwt...",               │
         │   username: "john",              │
         │   phone: "+71234567890"          │
         │ })                               │
         └──────────┬───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │ Save to AsyncStorage  │
        │ Update AuthContext    │
        └───────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────────────────┐
         │ AuthContext                      │
         ├──────────────────────────────────┤
         │ credentials: {                   │
         │   token: "jwt...",               │
         │   username: "john",              │
         │   phone: "+71234567890"          │
         │ }                                │
         │ isSignedIn: true                 │
         └──────────────────────────────────┘
                    │
                    ▼
            Navigate to /messages
```

## AsyncStorage Structure

```
AsyncStorage
│
└─── Key: 'auth_credentials'
     │
     Value (JSON):
     {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "username": "john_doe",
       "phone": "+79001234567"
     }
```

## Logout Flow

```
┌──────────────────────┐
│ User clicks Logout   │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────┐
│ handleLogout() called      │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│ clearCredentials()         │
│ (from useAuth)             │
└──────────┬─────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
AsyncStorage   AuthContext
Remove Key     Reset State
'auth_creds'   credentials = null
               isSignedIn = false
               │
               ▼
        Route to /(auth)
```

This architecture ensures:
✅ Single source of truth for auth state (AuthContext)
✅ Persistent credentials (AsyncStorage)
✅ Type-safe credential passing (TypeScript)
✅ Clean separation of concerns
✅ Scalable for future auth methods

