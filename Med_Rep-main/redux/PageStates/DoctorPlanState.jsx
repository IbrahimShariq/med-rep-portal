import React, { createContext, useContext, useState } from "react";

const DoctorPlanState = createContext();

export function DoctorPlanStateProvider({ children }) {

    const [dates, setDates] = useState({
        startDate: new Date(),
        endDate: new Date(),
    });

    return (
        <DoctorPlanState.Provider value={{ dates, setDates }}>
            {children}
        </DoctorPlanState.Provider>
    )
}

export default function useDoctorPlanState() {
    return useContext(DoctorPlanState)
}