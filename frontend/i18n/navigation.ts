import {createElement, type ComponentProps} from "react";
import {createNavigation} from "next-intl/navigation";

import {routing} from "./routing";
import {toAppHref} from "@/lib/app-href";

const {Link: IntlLink, useRouter, usePathname, redirect} = createNavigation(routing);

type LinkProps = ComponentProps<typeof IntlLink>;

export function Link(props: LinkProps) {
	if (typeof window !== "undefined" && window.location.protocol === "file:") {
		const {href, ...rest} = props;
		const resolvedHref = typeof href === "string" ? toAppHref(href) : href;

		return createElement("a", {...rest, href: resolvedHref});
	}

	return createElement(IntlLink, props);
}

export {useRouter, usePathname, redirect};
