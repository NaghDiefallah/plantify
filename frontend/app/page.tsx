import {VisitorLanding} from "@/components/visitor/visitor-landing";
import {GlassNav} from "@/components/layout/glass-nav";
import {SiteFooter} from "@/components/layout/site-footer";

export default function HomePage() {
	return (
		<>
			<GlassNav />
			<VisitorLanding />
			<SiteFooter />
		</>
	);
}
