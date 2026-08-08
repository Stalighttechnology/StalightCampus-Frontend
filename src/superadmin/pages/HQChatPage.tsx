import React from 'react';
import { HQChatUI } from '@/components/chat/HQChatUI';
import { motion } from 'framer-motion';

const HQChatPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 h-[calc(100vh-80px)] flex flex-col"
        >
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Stalight HQ Chat</h1>
                <p className="text-gray-500">Communicate directly with developers and super admins.</p>
            </div>
            <div className="flex-1 min-h-0">
                <HQChatUI />
            </div>
        </motion.div>
    );
};

export default HQChatPage;
