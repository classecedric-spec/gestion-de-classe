import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import DashboardStudentList from '../../../features/dashboard/components/DashboardStudentList';
import { DashboardContextType } from '../DashboardContext';
import { Student } from '../../../features/attendance/services/attendanceService';

const DashboardStudentsPage: React.FC = () => {
    const navigate = useNavigate();
    const { students, searchQuery, setSearchQuery, groups, selectedGroup, setSelectedGroup } = useOutletContext<DashboardContextType>();

    const handleStudentClick = (student: Student) => {
        navigate('/dashboard/user/students', {
            state: {
                selectedStudentId: student.id,
                initialTab: 'suivi'
            }
        });
    };

    return (
        <DashboardStudentList
            students={students}
            activeGroup={selectedGroup}
            groups={groups}
            onGroupChange={setSelectedGroup}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onStudentClick={handleStudentClick}
        />
    );
};

export default DashboardStudentsPage;
