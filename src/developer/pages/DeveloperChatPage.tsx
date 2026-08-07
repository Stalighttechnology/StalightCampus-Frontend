import React from 'react';
import { HQChatUI } from '@/components/chat/HQChatUI';
import { motion } from 'framer-motion';

const DeveloperChatPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 h-[calc(100vh-80px)] flex flex-col"
        >
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Developer HQ Chat</h1>
                <p className="text-gray-500">Coordinate directly with the Super Admin HQ team and other developers.</p>
            </div>
            <div className="flex-1 min-h-0">
                <HQChatUI />
            </div>
        </motion.div>
    );
};

export default DeveloperChatPage;
