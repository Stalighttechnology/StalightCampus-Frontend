import React from 'react';
import { HQChatUI } from '@/components/chat/HQChatUI';
import { motion } from 'framer-motion';

const DeveloperChatPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-8.5rem)] flex flex-col p-0 sm:p-2 md:p-0"
        >
            <div className="mb-2 sm:mb-3 shrink-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Developer HQ Chat</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Coordinate directly with the Super Admin HQ team and other developers.</p>
            </div>
            <div className="flex-1 min-h-0">
                <HQChatUI />
            </div>
        </motion.div>
    );
};

export default DeveloperChatPage;
