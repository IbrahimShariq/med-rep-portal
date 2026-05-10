import { format } from "date-fns";

export default function() {
    return [
        {
            id: 1,
            name: "Dr. Marcus Horizon",
            specialization: "Cardiologist",
            nmcNo: "012345",
            date: format(new Date(2026, 7, 3), "MMM d, yyyy"), // Aug 3, 2026
            shift: "Morning",
        },
        {
            id: 2,
            name: "Dr. Maria Elena",
            specialization: "Cardiologist",
            nmcNo: "012346",
            date: format(new Date(2026, 7, 3), "MMM d, yyyy"), // Aug 3, 2026
            shift: "Day",
        },
        {
            id: 3,
            name: "Dr. James Carter",
            specialization: "Neurologist",
            nmcNo: "012347",
            date: format(new Date(2026, 7, 4), "MMM d, yyyy"), // Aug 4, 2026
            shift: "Evening",
        },
        {
            id: 4,
            name: "Dr. Sophia Khan",
            specialization: "Dermatologist",
            nmcNo: "012348",
            date: format(new Date(2026, 7, 5), "MMM d, yyyy"), // Aug 5, 2026
            shift: "Morning",
        },
        {
            id: 5,
            name: "Dr. Ethan Williams",
            specialization: "Orthopedic",
            nmcNo: "012349",
            date: format(new Date(2026, 7, 5), "MMM d, yyyy"), // Aug 5, 2026
            shift: "Day",
        },
        {
            id: 7,
            name: "Dr. Ethan Numair",
            specialization: "Orthopedic",
            nmcNo: "012349",
            date: format(new Date(2026, 7, 5), "MMM d, yyyy"), // Aug 5, 2026
            shift: "Day",
        },
        {
            id: 8,
            name: "Dr. Sophia Khan",
            specialization: "Dermatologist",
            nmcNo: "012348",
            date: format(new Date(2026, 7, 5), "MMM d, yyyy"), // Aug 5, 2026
            shift: "Morning",
        },
    ];
}
