"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLast12MonthData = void 0;
async function generateLast12MonthData(model) {
    const last12Months = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i * 28);
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);
        const monthYear = endDate.toLocaleString("default", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
        const countAggregate = model.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate,
                    },
                },
            },
            {
                $count: "count",
            },
        ]);
        try {
            const result = await countAggregate;
            if (result.length > 0) {
                const [{ count }] = result;
                last12Months.push({ month: monthYear, count });
            }
            else {
                last12Months.push({ month: monthYear, count: 0 });
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    return { last12Months };
}
exports.generateLast12MonthData = generateLast12MonthData;
