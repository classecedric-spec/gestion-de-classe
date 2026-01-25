import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PortraitLayout from './layouts/PortraitLayout';
import StudentSelection from './screens/StudentSelection';
import StudentDashboard from './screens/StudentDashboard';

const StudentKiosk: React.FC = () => {
    return (
        <PortraitLayout>
            <Routes>
                <Route index element={<StudentSelection />} />
                <Route path=":studentId" element={<StudentDashboard />} />
            </Routes>
        </PortraitLayout>
    );
};

export default StudentKiosk;
