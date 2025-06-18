import React from "react";

//let currentSection: string;

function jumpToSection(section: string): { found: boolean; element?: HTMLButtonElement } {
	const sectBtn = document.querySelector(`[data-sect="${section}"]`) as HTMLButtonElement | null;
	if (sectBtn) {
		document.querySelectorAll("button[data-sect].selected").forEach((element) => {
			element.classList.remove("selected");
		});
		sectBtn.classList.add("selected");
		//currentSection = section;

		document.querySelectorAll("section.section").forEach((sect) => {
			if (sect instanceof HTMLElement) {
				if (sect.dataset.section === section) {
					sect.classList.remove("section-hidden");
					sect.classList.add("section-anim-in");
					sect.classList.remove("section-anim-out");
				} else {
					sect.classList.add("section-anim-out");
					sect.classList.remove("section-anim-in");
					setTimeout(() => {
						sect.classList.add("section-hidden");
					}, 300); // match animation duration
				}
			}
		});

		return { found: true, element: sectBtn };
	}
	console.error(`Navigation module: Section "${section}" could not be found.`);
	return { found: false };
}

const Section: React.FC<{ name: string; displayTitle?: string }> = ({ name, displayTitle }) => {
	const [SectionComponent, setSectionComponent] = React.useState<React.ComponentType | null>(null);

	React.useEffect(() => {
		let isMounted = true;
		import(`./sections/${name}.tsx`).then((mod) => {
			if (isMounted) setSectionComponent(() => mod.default);
		});
		return () => {
			isMounted = false;
		};
	}, [name]);

	React.useEffect(() => {
		const sectionElement = document.querySelector(`section[data-section="${name}"]`) as HTMLElement;
		if (sectionElement) {
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
		}
	}, []);

	return (
		<section className="section" data-section={name}>
			<label className="sectionLabel">{displayTitle || name}</label>
			{SectionComponent ? <SectionComponent /> : <div>Loading...</div>}
		</section>
	);
};

export { jumpToSection };
export default Section;
