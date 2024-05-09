/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Xwkjsl2GDWW
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Button } from "@/components/ui/button";
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  Dialog,
  DialogOverlay,
} from "@/components/ui/dialog";

export default function ErrorDialog(props: {
  setMessage: (message: string | undefined) => void;
  message: string | undefined;
}) {
  const setOpen = (open: boolean) => {
    if (!open) {
      props.setMessage(undefined);
    } else {
      props.setMessage(props.message);
    }
  };

  return (
    <Dialog open={typeof props.message === "string"} onOpenChange={setOpen}>
      <DialogOverlay className="z-[9999]" />
      <DialogContent className="z-[10000] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-2xl font-bold">
            Error
          </DialogTitle>
          <DialogDescription className="overflow-auto whitespace-normal text-wrap text-lg">
            {props.message}
          </DialogDescription>
        </DialogHeader>
        <Button
          variant={"outline"}
          onClick={() => setOpen(false)}
          className="border-foreground"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
