import { useEffect, useState, type ComponentType } from "react";

const hideTimeouts = new Map<string, number>();

function clearAllHideTimeouts() {
	hideTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
	hideTimeouts.clear();
}

function jumpToSection(section: string): { found: boolean; element?: HTMLButtonElement } {
	const sectBtn = document.querySelector(`[data-sect="${section}"]`) as HTMLButtonElement | null;
	if (sectBtn) {
		const targetSection = document.querySelector(`section[data-section="${section}"]`) as HTMLElement;
		const isAlreadyActive = sectBtn.classList.contains("selected") && targetSection && !targetSection.classList.contains("section-hidden") && !targetSection.classList.contains("section-anim-out");

		if (isAlreadyActive) {
			return { found: true, element: sectBtn };
		}

		document.querySelectorAll("button[data-sect].selected").forEach((element) => {
			element.classList.remove("selected");
		});
		sectBtn.classList.add("selected");

		document.querySelectorAll("section.section").forEach((sect) => {
			if (sect instanceof HTMLElement) {
				const sectionName = sect.dataset.section;
				if (!sectionName) return;

				if (hideTimeouts.has(sectionName)) {
					clearTimeout(hideTimeouts.get(sectionName));
					hideTimeouts.delete(sectionName);
				}

				if (sectionName === section) {
					sect.classList.remove("section-hidden");
					sect.classList.add("section-anim-in");
					sect.classList.remove("section-anim-out");
				} else {
					if (!sect.classList.contains("section-hidden")) {
						sect.classList.add("section-anim-out");
						sect.classList.remove("section-anim-in");

						const timeoutId = window.setTimeout(() => {
							if (sect.classList.contains("section-anim-out") && sectionName !== section) {
								sect.classList.add("section-hidden");
							}
							hideTimeouts.delete(sectionName);
						}, 300);

						hideTimeouts.set(sectionName, timeoutId);
					}
				}
			}
		});

		return { found: true, element: sectBtn };
	}
	console.error(`Navigation module: Section "${section}" could not be found.`);
	return { found: false };
}

interface SectionProps {
	name: string;
	displayTitle?: string;
}

const Section = ({ name, displayTitle }: SectionProps) => {
	const [SectionComponent, setSectionComponent] = useState<ComponentType | null>(null);

	useEffect(() => {
		let isMounted = true;
		import(`./sections/${name}.tsx`).then((mod) => {
			if (isMounted) setSectionComponent(() => mod.default);
		});
		return () => {
			isMounted = false;
		};
	}, [name]);

	useEffect(() => {
		const sectionElement = document.querySelector(`section[data-section="${name}"]`) as HTMLElement;
		if (sectionElement) {
			const handleAnimationEnd = (event: AnimationEvent) => {
				if (event.target === sectionElement) {
					if (event.animationName === "fadeOutSection") {
						sectionElement.classList.add("section-hidden");
						sectionElement.classList.remove("section-anim-out");
					} else if (event.animationName === "fadeInSection") {
						sectionElement.classList.remove("section-anim-in");
					}
				}
			};

			sectionElement.addEventListener("animationend", handleAnimationEnd);

			if (name !== "focus") {
				sectionElement.classList.add("section-hidden");
			} else {
				sectionElement.classList.remove("section-hidden");
				const focusButton = document.querySelector('[data-sect="focus"]') as HTMLButtonElement;
				if (focusButton) {
					document.querySelectorAll("button[data-sect].selected").forEach((element) => {
						element.classList.remove("selected");
					});
					focusButton.classList.add("selected");
				}
			}

			return () => {
				sectionElement.removeEventListener("animationend", handleAnimationEnd);
			};
		}
	}, [name]);

	return (
		<section className="section" data-section={name}>
			<h1 className="sectionHeader">{displayTitle || name}</h1>
			{SectionComponent ? <SectionComponent /> : <div>There was a problem loading this page, please open a new issue.</div>}
		</section>
	);
};

export { jumpToSection, clearAllHideTimeouts };
export default Section;
