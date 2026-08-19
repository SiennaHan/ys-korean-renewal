import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  height?: string;
	title?: string;
	count?: number;
  children: React.ReactNode;
}

const iconBase = "flex items-center justify-center cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]";
const buttonBase = "flex items-center justify-center text-[16px] text-white font-bold w-full h-[56px] bg-[#0180FF] rounded-full cursor-pointer hover:opacity-[0.8] active:opacity-[0.9]";

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  height = "90%",
	title,
	count,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="
              absolute bottom-0 inset-x-0 z-50
              bg-white rounded-t-2xl
              flex flex-col
            "
            style={{ height }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "tween",
							duration: 0.28,
  						ease: [0.22, 1, 0.36, 1]
              // stiffness: 300,
              // damping: 30,
            }}
          >
            <div className="flex justify-end pt-3 px-3">
              <button 
								className={iconBase}
								onClick={onClose}>
                <X />
              </button>
            </div>
						{title && (
							<div className="flex justify-center items-center text-[20px] font-bold pb-3 gap-1">
								<h2 className="text-[#24425F]">{title}</h2>
								<h2 className="text-[#0180FF]">{count}</h2>
							</div>
						)}

            <div className="flex-1 overflow-y-auto px-4 pb-0 scrollbar-hide">
              {children}
            </div>

            <div className="flex justify-center items-center p-[16px]">
              <button 
								className={buttonBase}
								onClick={onClose}>확인</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
