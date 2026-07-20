"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ModalState = {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  resolve?: (value: boolean) => void;
};

type ModalContextType = {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
  });

  const alert = useCallback((message: string, title = "Notice") => {
    return new Promise<void>((resolve) => {
      setModalState({
        isOpen: true,
        type: "alert",
        title,
        message,
        resolve: () => resolve(),
      });
    });
  }, []);

  const confirm = useCallback((message: string, title = "Please Confirm") => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        type: "confirm",
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open && modalState.resolve) {
      modalState.resolve(false);
      setModalState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      <AlertDialog open={modalState.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{modalState.title}</AlertDialogTitle>
            <AlertDialogDescription>{modalState.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {modalState.type === "confirm" && (
              <AlertDialogCancel onClick={() => handleOpenChange(false)}>Cancel</AlertDialogCancel>
            )}
            <AlertDialogAction onClick={handleConfirm}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
