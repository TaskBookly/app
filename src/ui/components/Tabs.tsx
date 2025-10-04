import React from "react";
import IcoButton from "./core";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface Tab {
	label: string;
	key: string;
	icon?: IconProp;
	content: React.ReactNode;
}

interface TabsProps {
	tabs: Tab[];
	initialKey?: string;
	className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, initialKey, className = "" }) => {
	const [activeKey, setActiveKey] = React.useState(initialKey || (tabs.length > 0 ? tabs[0].key : ""));

	return (
		<div className={`tabCont ${className}`}>
			<div className="tabs">
				{tabs.map((tab) => (
					<IcoButton text={tab.label} icon={tab.icon} key={tab.key} onClick={{ action: () => setActiveKey(tab.key) }} className={tab.key === activeKey ? "selected" : ""} />
				))}
			</div>
			<div className="tabContent">
				{tabs.map((tab) => (
					<div key={tab.key} style={{ display: tab.key === activeKey ? "block" : "none" }}>
						{tab.content}
					</div>
				))}
			</div>
		</div>
	);
};

export default Tabs;
