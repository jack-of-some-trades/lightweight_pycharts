import { icons } from "../../components/icons"


export const TOOL_FUNC_MAP = new Map<icons, ()=>void> ([
    [icons.trend_line, trend_line],
])

function trend_line(){}