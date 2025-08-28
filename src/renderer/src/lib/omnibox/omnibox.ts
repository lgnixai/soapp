import { AutocompleteController } from "@/lib/omnibox/autocomplete-controller";
import { AutocompleteProvider } from "@/lib/omnibox/base-provider";
import { SearchProvider } from "@/lib/omnibox/providers/search";
import { HistoryURLProvider } from "@/lib/omnibox/providers/history-url";
import { AutocompleteInput, AutocompleteMatch } from "@/lib/omnibox/types";
import { ZeroSuggestProvider } from "@/lib/omnibox/providers/zero-suggest";
import { OpenTabProvider } from "@/lib/omnibox/providers/open-tab";
import { OmniboxPedalProvider } from "@/lib/omnibox/providers/pedal";

/** Callback function type for notifying the UI/consumer about updated suggestions. */
export type OmniboxUpdateCallback = (results: AutocompleteMatch[], continuous?: boolean) => void;

export type OmniboxCreateOptions = {
  hasZeroSuggest?: boolean;
  hasPedals?: boolean;
};

export class Omnibox {
  private controller: AutocompleteController;
  private lastInputText: string = ""; // Track input to manage focus vs keystroke

  constructor(onUpdate: OmniboxUpdateCallback, options?: OmniboxCreateOptions) {
    // Instantiate providers based on the summary
    const providers: AutocompleteProvider[] = [
      new SearchProvider(), // Includes verbatim search + network suggestions
      new HistoryURLProvider(), // Includes history + URL suggestions
      new OpenTabProvider() // Includes open tabs
    ];

    // Includes zero-suggestions
    if (options?.hasZeroSuggest) {
      providers.push(new ZeroSuggestProvider());
    }

    // Includes pedals
    if (options?.hasPedals) {
      providers.push(new OmniboxPedalProvider());
    }

    this.controller = new AutocompleteController(providers, onUpdate);
  }

  /**
   * Call this when the user types in the Omnibox or focuses it.
   * @param text The current text in the Omnibox input field.
   * @param eventType Indicates if this was triggered by focusing the input or typing.
   */
  public handleInput(text: string, eventType: "focus" | "keystroke"): void {
    const input: AutocompleteInput = {
      text: text,
      type: eventType
      // currentURL: // Could get the current tab's URL if needed
    };

    // Basic logic to differentiate initial focus from subsequent keystrokes
    if (eventType === "focus" && text === this.lastInputText) {
      // If focused and text hasn't changed (e.g., clicking back into the bar)
      // Re-trigger with 'focus' type, especially important for ZeroSuggest
      this.controller.start(input);
    } else if (text !== this.lastInputText || eventType === "focus") {
      // If text changed OR it's a focus event (even with same text initially)
      this.controller.start(input);
    }
    // Else: Keystroke didn't change text (e.g., arrow keys) - do nothing for now

    this.lastInputText = text;
  }

  /** Call this when the Omnibox is blurred or closed to clean up. */
  public stopQuery(): void {
    this.controller.stop();
    this.lastInputText = ""; // Reset last input on stop
  }

  public openMatch(autocompleteMatch: AutocompleteMatch, whereToOpen: "current" | "new_tab"): void {
    if (autocompleteMatch.type === "open-tab") {
      const [, tabId] = autocompleteMatch.destinationUrl.split(":");
      flow.tabs.switchToTab(parseInt(tabId));
    } else if (autocompleteMatch.type === "pedal") {
      const pedalAction = autocompleteMatch.destinationUrl;
      // Execute the pedal action
      if (pedalAction === "open_settings") {
        flow.windows.openSettingsWindow();
      } else if (pedalAction === "open_new_window") {
        flow.browser.createWindow();
      } else if (pedalAction === "open_extensions") {
        flow.tabs.newTab("flow://extensions", true);
      }
    } else {
      const url = autocompleteMatch.destinationUrl;
      if (whereToOpen === "current") {
        flow.navigation.goTo(url);
      } else {
        flow.tabs.newTab(url, true);
      }
    }
  }
}
